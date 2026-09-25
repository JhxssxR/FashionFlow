using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize(Roles = "Admin,PurchasingOfficer,Accountant")]
public class SuppliersController(FashionFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        // Ratings are data-driven: computed live from each supplier's
        // delivered purchase orders (on-time = delivered on/before ETA).
        // Suppliers with no delivery history keep their baseline values.
        var delivered = await db.PurchaseOrders
            .Where(p => p.Status == "Delivered")
            .Select(p => new { p.SupplierId, p.Eta, p.DeliveredDate })
            .ToListAsync();

        // Cheapest historical unit cost per supplier (any product) so the
        // directory doubles as a quick price reference for purchasing.
        var quotes = await db.PurchaseOrders.Include(p => p.Product)
            .Where(p => p.Status != "Cancelled")
            .Select(p => new { p.SupplierId, p.UnitCost, Product = p.Product!.Name })
            .ToListAsync();

        var rows = await db.Suppliers.OrderBy(s => s.Name).ToListAsync();
        return Ok(rows.Select(s =>
        {
            var mine = delivered.Where(p => p.SupplierId == s.SupplierId).ToList();
            var onTimeCount = mine.Count(p => p.Eta == null || (p.DeliveredDate != null && p.DeliveredDate <= p.Eta));
            var onTime = mine.Count == 0
                ? s.OnTimeRate
                : (int)Math.Round(onTimeCount * 100.0 / mine.Count);
            var rating = mine.Count == 0
                ? s.Rating
                : (decimal)Math.Round(onTimeCount * 5.0 / mine.Count, 1);
            var best = quotes.Where(q => q.SupplierId == s.SupplierId).OrderBy(q => q.UnitCost).FirstOrDefault();
            return new
            {
                id = s.SupplierId,
                s.Name,
                s.Contact,
                s.Email,
                s.Category,
                s.Address,
                rating,
                onTime,
                bestCost = best?.UnitCost,
                bestProduct = best?.Product
            };
        }));
    }

    public record SaveSupplierRequest(
        [Required] string Name, [Required] string Contact, [Required, EmailAddress] string Email,
        [Required] string Category, [Required] string Address);

    [HttpPost]
    [Authorize(Roles = "Admin,PurchasingOfficer")]
    public async Task<IActionResult> Create(SaveSupplierRequest req)
    {
        var supplier = new Supplier
        {
            Name = req.Name.Trim(),
            Contact = req.Contact.Trim(),
            Email = req.Email.Trim().ToLowerInvariant(),
            Category = req.Category,
            Address = req.Address,
            Rating = 0,
            OnTimeRate = 0
        };
        db.Suppliers.Add(supplier);
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Supplier onboarded: {supplier.Name}", "Purchasing"));
        await db.SaveChangesAsync();

        // Auto-create a portal User account so the supplier can log in immediately.
        var existing = await db.Users.AnyAsync(u =>
            u.SupplierId == supplier.SupplierId ||
            string.Equals(u.Email, supplier.Email, StringComparison.OrdinalIgnoreCase));
        if (!existing)
        {
            db.Users.Add(new User
            {
                Name = supplier.Contact,
                Email = supplier.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("suppl13r!@#", workFactor: 10),
                Role = "Supplier",
                DashboardKey = "supplier",
                Status = "Active",
                SupplierId = supplier.SupplierId
            });
            await db.SaveChangesAsync();
        }

        return StatusCode(201, new { id = supplier.SupplierId, supplier.Name });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,PurchasingOfficer")]
    public async Task<IActionResult> Update(int id, SaveSupplierRequest req)
    {
        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound(new { message = "Supplier not found." });

        supplier.Name = req.Name.Trim();
        supplier.Contact = req.Contact.Trim();
        supplier.Email = req.Email.Trim().ToLowerInvariant();
        supplier.Category = req.Category;
        supplier.Address = req.Address;
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Supplier updated: {supplier.Name}", "Purchasing"));
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // One row of the price comparison (serialized camelCase by the
    // framework's default JSON policy, matching the other endpoints).
    private sealed record CompareRow(
        int SupplierId, string Supplier, string Location, decimal Rating, int OnTime,
        int Orders, int TotalUnits, decimal? BestUnitCost, int? BestQty, string? BestDate,
        decimal? LastUnitCost, string? LastDate, int? LeadDays, bool HasHistory, bool IsBest);

    // Price comparison for one product: EVERY supplier is listed so
    // purchasing can choose (by price, rating and delivery speed), with
    // best/last unit costs from real purchase orders where history exists.
    // Suppliers without history show NO HISTORY and can still be ordered
    // from — their first PO sets the benchmark.
    [HttpGet("price-comparison")]
    public async Task<IActionResult> PriceComparison([FromQuery] int productId)
    {
        var product = await db.Products.FindAsync(productId);
        if (product is null) return NotFound(new { message = "Product not found." });

        var suppliers = await db.Suppliers.OrderBy(s => s.Name).ToListAsync();
        var productPos = await db.PurchaseOrders
            .Where(p => p.ProductId == productId && p.Status != "Cancelled")
            .ToListAsync();
        // Overall delivery record per supplier (same formula as the
        // directory: on-time share of delivered orders, rating = share × 5).
        var allDelivered = await db.PurchaseOrders
            .Where(p => p.Status == "Delivered")
            .Select(p => new { p.SupplierId, p.Eta, p.DeliveredDate })
            .ToListAsync();

        var withHistory = new List<CompareRow>();
        var withoutHistory = new List<CompareRow>();
        foreach (var s in suppliers)
        {
            var overall = allDelivered.Where(p => p.SupplierId == s.SupplierId).ToList();
            var overallOnTimeCount = overall.Count(p => p.Eta == null || (p.DeliveredDate != null && p.DeliveredDate <= p.Eta));
            var onTime = overall.Count == 0 ? s.OnTimeRate : (int)Math.Round(overallOnTimeCount * 100.0 / overall.Count);
            var liveRating = overall.Count == 0 ? s.Rating : (decimal)Math.Round(overallOnTimeCount * 5.0 / overall.Count, 1);

            var mine = productPos.Where(p => p.SupplierId == s.SupplierId).ToList();
            if (mine.Count == 0)
            {
                withoutHistory.Add(new CompareRow(
                    s.SupplierId, s.Name, s.Address, liveRating, onTime,
                    0, 0, null, null, null, null, null, null, false, false));
                continue;
            }

            var best = mine.OrderBy(p => p.UnitCost).First();
            var latest = mine.OrderByDescending(p => p.IssuedDate).ThenByDescending(p => p.PurchaseId).First();
            var deliveredMine = mine.Where(p => p.Status == "Delivered" && p.DeliveredDate != null).ToList();
            int? leadDays = deliveredMine.Count == 0
                ? null
                : (int)Math.Round(deliveredMine.Average(p => (p.DeliveredDate!.Value.DayNumber - p.IssuedDate.DayNumber)));
            withHistory.Add(new CompareRow(
                s.SupplierId, s.Name, s.Address, liveRating, onTime,
                mine.Count, mine.Sum(p => p.Quantity),
                best.UnitCost, best.Quantity, best.IssuedDate.ToString("yyyy-MM-dd"),
                latest.UnitCost, latest.IssuedDate.ToString("yyyy-MM-dd"),
                leadDays, true, false));
        }

        // Cheapest first, then the untried suppliers alphabetically.
        var floor = withHistory.Count == 0 ? (decimal?)null : withHistory.Min(r => r.BestUnitCost);
        var ordered = withHistory
            .OrderBy(r => r.BestUnitCost)
            .Select(r => floor != null && r.BestUnitCost == floor ? r with { IsBest = true } : r)
            .Concat(withoutHistory)
            .ToList();

        return Ok(new
        {
            product = new { id = product.ProductId, name = product.Name, variant = product.Variant, retail = product.Price },
            rows = ordered
        });
    }
}
