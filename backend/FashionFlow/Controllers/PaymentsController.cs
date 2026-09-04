using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

// Online checkout: the storefront cart POSTs here, PayMongo hosts the
// payment page, and the webhook fulfils the order through the same pipeline
// as the POS charge (stock, movements, loyalty, logs).
[ApiController]
[Route("api")]
public class PaymentsController(
    FashionFlowDbContext db,
    PayMongoService paymongo,
    OrderFulfillmentService fulfillment,
    IConfiguration config,
    IWebHostEnvironment env) : ControllerBase
{
    private string PublicBaseUrl => config["App:PublicBaseUrl"] ?? $"{Request.Scheme}://{Request.Host.Value}";

    // Places an order and returns the payment URL. Requires a signed-in
    // Customer account — identity and loyalty come from the token, and the
    // storefront blocks checkout before this point anyway (defence in depth).
    [HttpPost("checkout")]
    [Authorize(Roles = "Customer,Admin")]
    public async Task<IActionResult> Checkout(CheckoutRequest req)
    {
        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "Only customer accounts can place orders. Register or sign in first." });
        var customer = await db.Customers.FindAsync(customerId);
        if (customer is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        // Merge duplicate lines and validate against live stock.
        var merged = req.Items.GroupBy(i => i.ProductId)
            .Select(g => (ProductId: g.Key, Quantity: g.Sum(i => i.Quantity)))
            .ToList();
        var products = await db.Products.Include(p => p.Inventories)
            .Where(p => merged.Select(m => m.ProductId).Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId);

        foreach (var (productId, qty) in merged)
        {
            if (!products.TryGetValue(productId, out var p))
                return NotFound(new { message = $"Product #{productId} not found." });
            if (!p.IsActive)
                return BadRequest(new { message = $"{p.Name} is no longer sold." });
            if (p.Stock < qty)
                return Conflict(new { message = $"Not enough stock for {p.Name} — {p.Stock} left." });
        }

        var subtotal = merged.Sum(m => products[m.ProductId].Price * m.Quantity);
        var orderNumber = await NextOrderNumberAsync();

        var order = new Order
        {
            OrderNumber = orderNumber,
            CustomerId = customer.CustomerId,
            GuestEmail = customer.Email,
            ShippingAddress = req.ShippingAddress.Trim(),
            ItemsSummary = string.Join(", ", merged.Select(m => $"{products[m.ProductId].Name} ×{m.Quantity}")),
            Subtotal = subtotal,
            Total = subtotal,
            Status = "Pending",
            CreatedAt = DateTime.Now
        };
        foreach (var (productId, qty) in merged)
        {
            order.Items.Add(new OrderItem { ProductId = productId, Quantity = qty, UnitPrice = products[productId].Price });
        }

        db.Orders.Add(order);
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"Order {orderNumber} placed — {order.ItemsSummary} (₱{subtotal:N0})", "Sales"));
        await db.SaveChangesAsync();

        if (paymongo.IsConfigured)
        {
            try
            {
                var lineItems = merged.Select(m =>
                    (Name: $"{products[m.ProductId].Name} ({products[m.ProductId].Variant})", Quantity: m.Quantity, UnitPrice: products[m.ProductId].Price)).ToList();
                var (sessionId, checkoutUrl) = await paymongo.CreateCheckoutSessionAsync(
                    order, lineItems,
                    $"{PublicBaseUrl}/#checkout/success/{orderNumber}",
                    $"{PublicBaseUrl}/#checkout/cancel/{orderNumber}");
                order.CheckoutSessionId = sessionId;
                await db.SaveChangesAsync();
                return StatusCode(201, new { orderNumber = orderNumber, checkoutUrl = checkoutUrl, mock = false });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(502, new { message = ex.Message });
            }
        }

        // No PayMongo keys yet: in Development the checkout returns a local
        // mock-pay page so the full flow stays demoable; in production it
        // says payments are not configured.
        if (env.IsDevelopment())
        {
            return StatusCode(201, new
            {
                orderNumber = orderNumber,
                checkoutUrl = $"{PublicBaseUrl}/#checkout/mock-pay/{orderNumber}",
                mock = true
            });
        }
        return StatusCode(503, new { message = "Online payments are not configured yet (missing PayMongo:SecretKey)." });
    }

    private async Task<string> NextOrderNumberAsync()
    {
        var saleNumbers = await db.Sales.Where(s => s.ReceiptNo.StartsWith("FF-"))
            .Select(s => s.ReceiptNo).ToListAsync();
        var orderNumbers = await db.Orders.Select(o => o.OrderNumber).ToListAsync();
        var max = saleNumbers.Concat(orderNumbers)
            .Select(s => int.TryParse(s.AsSpan(3), out var n) ? n : 0)
            .DefaultIfEmpty(10241)
            .Max();
        return $"FF-{max + 1}";
    }

    // PayMongo calls this when a checkout session is paid. Signature-verified
    // (HMAC of the raw body with the webhook secret) and idempotent.
    [HttpPost("payments/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var raw = await reader.ReadToEndAsync();

        if (!PayMongoService.VerifyWebhookSignature(
                config["PayMongo:WebhookSecret"],
                Request.Headers["PayMongo-Signature"].FirstOrDefault(),
                raw))
        {
            return Unauthorized(new { message = "Invalid webhook signature." });
        }

        var eventType = PayMongoService.ExtractEventType(raw);
        var sessionId = PayMongoService.ExtractCheckoutSessionId(raw);
        if (eventType != "checkout_session.payment.paid" || sessionId is null)
            return Ok(new { ignored = eventType });

        var order = await db.Orders.Include(o => o.Items).ThenInclude(i => i.Product).ThenInclude(p => p!.Inventories)
            .FirstOrDefaultAsync(o => o.CheckoutSessionId == sessionId);
        if (order is null) return NotFound(new { message = "Unknown checkout session." });
        if (order.Status == "Paid") return Ok(new { order = order.OrderNumber, idempotent = true });

        await using var tx = await db.Database.BeginTransactionAsync();
        var error = await fulfillment.FulfillAsync(order, "paymongo-webhook");
        await tx.CommitAsync(); // commits Paid (or Failed-on-shortfall) + logs
        return error is null
            ? Ok(new { order = order.OrderNumber, status = order.Status })
            : Conflict(new { message = error, status = order.Status });
    }

    // Development-only stand-in for the PayMongo payment page so the whole
    // flow (cart → order → fulfilment) is demoable before PayMongo keys exist.
    [HttpPost("payments/mock-confirm")]
    [AllowAnonymous]
    public async Task<IActionResult> MockConfirm(MockConfirmRequest req)
    {
        if (!env.IsDevelopment()) return NotFound();

        var order = await db.Orders.Include(o => o.Items).ThenInclude(i => i.Product).ThenInclude(p => p!.Inventories)
            .FirstOrDefaultAsync(o => o.OrderNumber == req.OrderNumber);
        if (order is null) return NotFound(new { message = "Order not found." });
        if (order.Status != "Pending")
            return Conflict(new { message = $"Order is already {order.Status}." });

        await using var tx = await db.Database.BeginTransactionAsync();
        var error = await fulfillment.FulfillAsync(order, User.Identity?.IsAuthenticated == true ? User.Email() : "mock-payment");
        await tx.CommitAsync();
        return error is null
            ? Ok(new { order = order.OrderNumber, status = order.Status, paidAt = order.PaidAt })
            : Conflict(new { message = error, status = order.Status });
    }

    // The logged-in customer's online orders (for the purchase-history page).
    [HttpGet("orders/mine")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Mine()
    {
        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        var rows = await db.Orders
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.OrderNumber,
                date = o.CreatedAt,
                items = o.ItemsSummary,
                total = o.Total,
                status = o.Status,
                points = db.Sales.Where(s => s.ReceiptNo == o.OrderNumber).Sum(s => (int?)s.LoyaltyPointsEarned) ?? 0
            })
            .ToListAsync();
        return Ok(rows);
    }
}
