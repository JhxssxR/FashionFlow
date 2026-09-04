using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/sales")]
public class SalesController(FashionFlowDbContext db) : ControllerBase
{
    private static readonly string[] PaymentMethods = ["Cash", "Card", "GCash", "Maya"];

    private static string HourLabel(int hour) =>
        hour == 12 ? "12 NN" : hour < 12 ? $"{hour} AM" : $"{hour - 12} PM";

    // One row per receipt (a sale transaction spans several Sale lines).
    private static object ReceiptRow(string receipt, DateTime time, string customer, int items,
        decimal total, string payment, int loyalty) =>
        new { id = receipt, time, customer, items, total, payment, loyalty };

    [HttpGet("recent")]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> Recent([FromQuery] int count = 12)
    {
        var rows = await db.Sales.Include(s => s.Customer)
            .OrderByDescending(s => s.SaleId)
            .Take(Math.Clamp(count, 1, 50) * 8)
            .ToListAsync();

        var receipts = rows.GroupBy(s => s.ReceiptNo)
            .OrderByDescending(g => g.Max(s => s.Date))
            .Take(Math.Clamp(count, 1, 50))
            .Select(g => ReceiptRow(
                g.Key,
                g.Max(s => s.Date),
                g.FirstOrDefault(s => s.CustomerId != null)?.Customer?.Name ?? "Walk-in",
                g.Sum(s => s.Quantity),
                g.Sum(s => s.TotalAmount),
                g.First().PaymentMethod,
                g.Sum(s => s.LoyaltyPointsEarned)))
            .ToList();
        return Ok(receipts);
    }

    [HttpGet("today")]
    [Authorize(Roles = "Admin,SalesStaff,Accountant")]
    public async Task<IActionResult> Today()
    {
        var today = DateTime.Today;
        var sales = await db.Sales
            .Where(s => s.Date >= today || (s.Date >= today.AddDays(-1) && s.Date < today))
            .ToListAsync();

        var todays = sales.Where(s => s.Date >= today).ToList();
        var yesterdays = sales.Where(s => s.Date < today).ToList();

        var total = todays.Sum(s => s.TotalAmount);
        var transactions = todays.GroupBy(s => s.ReceiptNo).Count();
        var yesterdayTotal = yesterdays.Sum(s => s.TotalAmount);

        var rawHours = todays.GroupBy(s => s.Date.Hour)
            .Select(g => new { Hour = g.Key, Sales = g.Sum(s => s.TotalAmount), Tx = g.GroupBy(s => s.ReceiptNo).Count() })
            .ToDictionary(x => x.Hour);
        var byHour = Enumerable.Range(9, 13) // 9 AM – 9 PM window, POS hours
            .Select(h => new
            {
                hour = HourLabel(h),
                sales = rawHours.TryGetValue(h, out var v) ? v.Sales : 0m,
                transactions = rawHours.TryGetValue(h, out var v2) ? v2.Tx : 0
            })
            .ToList();

        var byPayment = todays.GroupBy(s => s.PaymentMethod)
            .Select(g => new { method = g.Key, amount = g.Sum(s => s.TotalAmount), count = g.GroupBy(s => s.ReceiptNo).Count() })
            .OrderByDescending(x => x.amount)
            .ToList();

        return Ok(new
        {
            total,
            transactions,
            itemsSold = todays.Sum(s => s.Quantity),
            loyaltyIssued = todays.Sum(s => s.LoyaltyPointsEarned),
            avgBasket = transactions == 0 ? 0 : Math.Round(total / transactions, 2),
            vsYesterdayPct = yesterdayTotal == 0 ? 0 : Math.Round((total - yesterdayTotal) / yesterdayTotal * 100, 1),
            yesterdayTotal,
            byHour,
            byPayment
        });
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SalesStaff,Accountant")]
    public async Task<IActionResult> Range([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var start = (from ?? DateTime.Today).Date;
        var end = (to ?? DateTime.Today).Date.AddDays(1);

        var rows = await db.Sales.Include(s => s.Customer)
            .Where(s => s.Date >= start && s.Date < end)
            .ToListAsync();

        var receipts = rows.GroupBy(s => s.ReceiptNo)
            .OrderByDescending(g => g.Max(s => s.Date))
            .Select(g => ReceiptRow(
                g.Key,
                g.Max(s => s.Date),
                g.FirstOrDefault(s => s.CustomerId != null)?.Customer?.Name ?? "Walk-in",
                g.Sum(s => s.Quantity),
                g.Sum(s => s.TotalAmount),
                g.First().PaymentMethod,
                g.Sum(s => s.LoyaltyPointsEarned)))
            .ToList();
        return Ok(receipts);
    }

    // Customer's own purchase history (purchase orders of the CRM sense:
    // online + POS receipts linked to their CustomerId).
    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Mine()
    {
        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        var rows = await db.Sales.Include(s => s.Product)
            .Where(s => s.CustomerId == customerId)
            .ToListAsync();

        var receipts = rows.GroupBy(s => s.ReceiptNo)
            .OrderByDescending(g => g.Max(s => s.Date))
            .Select(g => new
            {
                id = g.Key,
                date = g.Max(s => s.Date).ToString("yyyy-MM-dd"),
                items = string.Join(", ", g.Select(s =>
                    s.Product!.Name + (s.Quantity > 1 ? $" ×{s.Quantity}" : ""))),
                total = g.Sum(s => s.TotalAmount),
                status = "Delivered",
                points = g.Sum(s => s.LoyaltyPointsEarned)
            })
            .ToList();
        return Ok(receipts);
    }

    // The POS charge. One transaction that: validates stock, applies the
    // promotion, writes the Sale lines, decrements inventory, records stock
    // movements, awards loyalty points and writes the audit log — the ERP
    // connection between the POS, Inventory, Loyalty and Promotions modules.
    [HttpPost]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> Charge(CreateSaleRequest req)
    {
        // Match the canonical casing ("GCash", "Maya", …) case-insensitively.
        var method = PaymentMethods.FirstOrDefault(m =>
            string.Equals(m, req.PaymentMethod.Trim(), StringComparison.OrdinalIgnoreCase));
        if (method is null)
            return BadRequest(new { message = "Payment method must be Cash, Card, GCash or Maya." });

        await using var tx = await db.Database.BeginTransactionAsync();

        var customer = req.CustomerId is int cid
            ? await db.Customers.FirstOrDefaultAsync(c => c.CustomerId == cid)
            : null;
        if (req.CustomerId is not null && customer is null)
            return NotFound(new { message = "Customer not found." });

        // Merge duplicate product lines, then validate everything up front.
        var lines = req.Items
            .GroupBy(i => i.ProductId)
            .Select(g => (ProductId: g.Key, Quantity: g.Sum(i => i.Quantity)))
            .ToList();
        var productIds = lines.Select(l => l.ProductId).ToList();
        var products = await db.Products.Include(p => p.Inventories)
            .Where(p => productIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId);

        foreach (var (productId, qty) in lines)
        {
            if (!products.TryGetValue(productId, out var p))
                return NotFound(new { message = $"Product #{productId} not found." });
            if (!p.IsActive)
                return BadRequest(new { message = $"{p.Name} is no longer sold." });
            if (p.Stock < qty)
                return Conflict(new { message = $"Not enough stock for {p.Name} — {p.Stock} left." });
        }

        var subtotal = lines.Sum(l => products[l.ProductId].Price * l.Quantity);

        // Promotion (optional).
        Promotion? promo = null;
        decimal discount = 0;
        var promoMessage = "";
        if (!string.IsNullOrWhiteSpace(req.PromoCode))
        {
            var code = req.PromoCode.Trim().ToUpperInvariant();
            promo = await db.Promotions.FirstOrDefaultAsync(p => p.Code == code);
            if (promo is null)
                return NotFound(new { message = $"Promo code {code} does not exist." });
            var ineligible = PromoRules.CheckEligible(promo, DateTime.Now, customer?.Tier);
            if (ineligible is not null)
                return Conflict(new { message = ineligible });

            var lineSubtotals = lines.Select(l => products[l.ProductId].Price * l.Quantity).ToArray();
            var lineCategories = lines.Select(l => products[l.ProductId].Category).ToArray();
            var clearance = lines.Select(l => products[l.ProductId].OriginalPrice != null).ToArray();
            discount = PromoRules.ComputeDiscount(promo, lineSubtotals, lineCategories, clearance, customer?.Tier);
            promoMessage = discount > 0 ? $"{promo.Description} applied (−₱{discount:N0})" : $"{promo.Code} does not apply to this basket.";
        }
        discount = Math.Min(discount, subtotal);
        var grandTotal = subtotal - discount;

        // Receipt number: continue the POS-1xxx series past the seeded ones.
        var receiptCount = await db.Sales.Select(s => s.ReceiptNo).Distinct().CountAsync();
        var receipt = $"POS-{1000 + receiptCount + 1}";

        // Loyalty award is based on the discounted total; per-line stamps are
        // allocated proportionally so a receipt's lines sum to that award.
        var pointsEarned = customer is null ? 0 : LoyaltyRules.PointsFor(grandTotal);
        var lineTotals = lines.Select(l => products[l.ProductId].Price * l.Quantity).ToList();
        var linePoints = new int[lines.Count];
        if (pointsEarned > 0)
        {
            var allocated = 0;
            for (var i = 0; i < lines.Count - 1; i++)
            {
                linePoints[i] = (int)(pointsEarned * lineTotals[i] / grandTotal);
                allocated += linePoints[i];
            }
            linePoints[^1] = pointsEarned - allocated;
        }

        var now = DateTime.Now;
        for (var i = 0; i < lines.Count; i++)
        {
            var (productId, qty) = lines[i];
            var p = products[productId];
            db.Sales.Add(new Sale
            {
                ReceiptNo = receipt,
                CustomerId = customer?.CustomerId,
                ProductId = productId,
                Quantity = qty,
                UnitPrice = p.Price,
                TotalAmount = p.Price * qty,
                Date = now,
                PaymentMethod = method,
                Channel = "POS",
                LoyaltyPointsEarned = linePoints[i]
            });

            p.Stock -= qty;
            var inv = p.Inventories.FirstOrDefault();
            if (inv is not null) inv.Quantity -= qty;

            db.StockMovements.Add(new StockMovement
            {
                ProductId = productId,
                Quantity = qty,
                Direction = "Out",
                Date = now,
                Reference = receipt
            });
        }

        if (customer is not null && pointsEarned > 0)
        {
            db.Loyalties.Add(new Loyalty
            {
                CustomerId = customer.CustomerId,
                PointsEarned = pointsEarned,
                PointsRedeemed = 0,
                Date = now,
                Note = $"Earned from {receipt}"
            });
            customer.LoyaltyPoints += pointsEarned;
            customer.Tier = LoyaltyRules.TierFor(customer.LoyaltyPoints);
        }

        if (promo is not null && discount > 0) promo.Uses++;

        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"POS sale {receipt} completed — ₱{grandTotal:N0}" +
            (customer is null ? "" : $" · {customer.Name} +{pointsEarned} pts") +
            (discount > 0 ? $" · promo {promo!.Code}" : ""), "Sales"));

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return StatusCode(201, new
        {
            receipt,
            subtotal,
            discount,
            total = grandTotal,
            pointsEarned,
            customer = customer is null ? null : new { customer.Name, customer.Tier, customer.LoyaltyPoints },
            promoMessage
        });
    }
}
