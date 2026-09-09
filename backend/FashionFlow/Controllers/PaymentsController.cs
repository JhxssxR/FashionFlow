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

    // Maps the storefront's payment choice to (display name, PayMongo filter).
    private static readonly Dictionary<string, (string Label, string[] Types)> PaymentMethods =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["gcash"] = ("GCash", ["gcash"]),
            ["maya"] = ("Maya", ["maya"]),
            ["card"] = ("Card", ["card"]),
            ["cod"] = ("Cash on Delivery", [])
        };

    // Places an order and returns the payment URL (or, for Cash on Delivery,
    // fulfils the order on the spot). Requires a signed-in Customer account —
    // identity and loyalty come from the token, and the storefront blocks
    // checkout before this point anyway (defence in depth).
    [HttpPost("checkout")]
    [Authorize(Roles = "Customer,Admin")]
    public async Task<IActionResult> Checkout(CheckoutRequest req)
    {
        var methodKey = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "online" : req.PaymentMethod.Trim().ToLowerInvariant();
        if (methodKey == "cashondelivery") methodKey = "cod";
        // "online"/omitted → no filter, the hosted page offers every method.
        if (methodKey != "online" && !PaymentMethods.ContainsKey(methodKey))
            return BadRequest(new { message = "Unknown payment method." });
        (string Label, string[] Types)? chosen = methodKey == "online" ? null : PaymentMethods[methodKey];

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

        // Optional promo/voucher code (loyalty reward vouchers are RWD-xxxxxx,
        // single-use, created by /api/loyalty/redeem). The discount is computed
        // with the same rules the POS uses and stamped on the order.
        decimal discount = 0;
        Promotion? appliedPromo = null;
        if (!string.IsNullOrWhiteSpace(req.PromoCode))
        {
            var code = req.PromoCode.Trim().ToUpperInvariant();
            appliedPromo = await db.Promotions.FirstOrDefaultAsync(p => p.Code == code);
            if (appliedPromo is null)
                return NotFound(new { message = "Promo code does not exist." });
            var ineligible = PromoRules.CheckEligible(appliedPromo, DateTime.Now, customer.Tier);
            if (ineligible is not null)
                return BadRequest(new { message = ineligible });
            var belowMinimum = PromoRules.CheckMinSpend(appliedPromo, subtotal);
            if (belowMinimum is not null)
                return BadRequest(new { message = belowMinimum });

            var lineSubtotals = merged.Select(m => products[m.ProductId].Price * m.Quantity).ToArray();
            var lineCategories = merged.Select(m => products[m.ProductId].Category).ToArray();
            var clearance = merged.Select(m => products[m.ProductId].OriginalPrice != null).ToArray();
            discount = PromoRules.ComputeDiscount(appliedPromo, lineSubtotals, lineCategories, clearance, customer.Tier);
            if (discount <= 0)
                return BadRequest(new { message = "This promo does not apply to the items in your cart." });
        }

        var orderNumber = await NextOrderNumberAsync();

        var order = new Order
        {
            OrderNumber = orderNumber,
            CustomerId = customer.CustomerId,
            GuestEmail = customer.Email,
            ShippingAddress = req.ShippingAddress.Trim(),
            ItemsSummary = string.Join(", ", merged.Select(m => $"{products[m.ProductId].Name} ×{m.Quantity}")),
            Subtotal = subtotal,
            Discount = discount,
            PromoCode = appliedPromo?.Code,
            Total = subtotal - discount,
            Status = "Pending",
            PaymentMethod = chosen?.Label ?? "Online",
            CreatedAt = DateTime.Now
        };
        foreach (var (productId, qty) in merged)
        {
            order.Items.Add(new OrderItem { ProductId = productId, Quantity = qty, UnitPrice = products[productId].Price });
        }

        db.Orders.Add(order);
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"Order {orderNumber} placed — {order.ItemsSummary} (₱{subtotal:N0}, {order.PaymentMethod})", "Sales"));

        // Bell: admin, inventory manager, and sales floor see the order the moment it's placed.
        var placedBody = $"{order.ItemsSummary} — ₱{order.Total:N0} ({order.PaymentMethod}), awaiting payment.";
        await Notifications.PushRoleAsync(db, "Admin",
            $"New online order {orderNumber}", placedBody, "Order", "dashboard/admin/orders");
        await Notifications.PushRoleAsync(db, "InventoryManager",
            $"New online order {orderNumber}", placedBody, "Order", "dashboard/inventory/orders");
        await Notifications.PushRoleAsync(db, "SalesStaff",
            $"New online order {orderNumber}", placedBody, "Order", "dashboard/sales/overview");

        await db.SaveChangesAsync();

        // Cash on Delivery: no gateway involved — reserve stock immediately,
        // but do not record payment received until courier delivers the package.
        if (methodKey == "cod")
        {
            // Reserve stock and record movement
            foreach (var (productId, qty) in merged)
            {
                var prod = products[productId];
                prod.Stock -= qty;
                var inv = prod.Inventories.FirstOrDefault();
                if (inv is not null) inv.Quantity -= qty;

                db.StockMovements.Add(new StockMovement
                {
                    ProductId = productId,
                    Quantity = qty,
                    Direction = "Out",
                    Date = DateTime.Now,
                    Reference = orderNumber
                });
            }

            // Single-use promo/voucher (RWD-) burned on order placement
            if (!string.IsNullOrEmpty(order.PromoCode) && order.PromoCode.StartsWith("RWD-"))
            {
                var voucher = await db.Promotions.FirstOrDefaultAsync(p => p.Code == order.PromoCode);
                if (voucher is not null) voucher.IsActive = false;
            }

            order.Status = "Pending";
            order.PaidAt = null;

            await db.SaveChangesAsync();
            return StatusCode(201, new { orderNumber = orderNumber, cod = true });
        }

        if (paymongo.IsConfigured)
        {
            try
            {
                var lineItems = merged.Select(m =>
                    (Name: $"{products[m.ProductId].Name} ({products[m.ProductId].Variant})", Quantity: m.Quantity, UnitPrice: products[m.ProductId].Price)).ToList();
                // PayMongo cannot take negative lines — fold the discount into
                // the last line so the hosted page charges the discounted total.
                if (discount > 0 && lineItems.Count > 0)
                {
                    var (name, qty, unit) = lineItems[^1];
                    lineItems[^1] = (name, qty, Math.Max(0m, unit - discount / qty));
                }
                var (sessionId, checkoutUrl) = await paymongo.CreateCheckoutSessionAsync(
                    order, lineItems,
                    $"{PublicBaseUrl}/#checkout/success/{orderNumber}",
                    $"{PublicBaseUrl}/#checkout/cancel/{orderNumber}",
                    chosen?.Types);
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
                checkoutUrl = methodKey == "online"
                    ? $"{PublicBaseUrl}/#checkout/mock-pay/{orderNumber}"
                    : $"{PublicBaseUrl}/#checkout/mock-pay/{orderNumber}/{methodKey}",
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

    // Forward-only delivery pipeline AFTER payment. "Paid" is stamped by
    // fulfilment; staff move the order the rest of the way.
    private static readonly string[] DeliveryPipeline = ["Paid", "Shipped", "Out for Delivery", "Delivered"];

    // Staff view of every online order (delivery tracking on Admin / Inventory Manager
    // dashboards) — the staff-side counterpart of /orders/mine.
    [HttpGet("orders")]
    [Authorize(Roles = "Admin,SalesStaff,InventoryManager")]
    public async Task<IActionResult> All([FromQuery] string? status)
    {
        var q = db.Orders.Include(o => o.Customer).AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(o => o.Status == status);

        var rows = await q.OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.OrderNumber,
                date = o.CreatedAt,
                customer = o.Customer == null ? o.GuestEmail : o.Customer.Name,
                items = o.ItemsSummary,
                total = o.Total,
                paymentMethod = o.PaymentMethod,
                o.Status
            })
            .ToListAsync();
        return Ok(rows);
    }

    // Move an order along the delivery pipeline. For Online orders: Paid → Shipped → Out for Delivery → Delivered.
    // For COD orders: Pending → Shipped → Out for Delivery → Delivered (payment received on delivery).
    [HttpPut("orders/{orderNumber}/status")]
    [Authorize(Roles = "Admin,SalesStaff,InventoryManager")]
    public async Task<IActionResult> SetDeliveryStatus(string orderNumber, UpdateStatusRequest req)
    {
        var order = await db.Orders.Include(o => o.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order is null) return NotFound(new { message = "Order not found." });

        var isCod = string.Equals(order.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(order.PaymentMethod, "cod", StringComparison.OrdinalIgnoreCase);

        var allowedNext = isCod switch
        {
            true => order.Status switch
            {
                "Pending" or "Placed" or "Confirmed" or "Paid" => "Shipped",
                "Shipped" => "Out for Delivery",
                "Out for Delivery" => "Delivered",
                _ => null
            },
            false => order.Status switch
            {
                "Paid" => "Shipped",
                "Shipped" => "Out for Delivery",
                "Out for Delivery" => "Delivered",
                _ => null
            }
        };

        if (allowedNext == null || allowedNext != req.Status)
        {
            var expectedFlow = isCod
                ? "Pending → Shipped → Out for Delivery → Delivered"
                : "Paid → Shipped → Out for Delivery → Delivered";
            return Conflict(new { message = $"Cannot move order {order.OrderNumber} from {order.Status} to {req.Status}. Follow {expectedFlow}." });
        }

        order.Status = req.Status;

        // If Cash on Delivery reaches Delivered, the courier collected the payment — record Sale & loyalty now!
        if (isCod && req.Status == "Delivered" && order.PaidAt == null)
        {
            order.PaidAt = DateTime.Now;

            var customer = order.CustomerId is int cid ? await db.Customers.FindAsync(cid) : null;
            var pointsEarned = customer is null ? 0 : LoyaltyRules.PointsFor(order.Total);

            // Record Sale rows (stock was already reserved at checkout)
            var itemCount = Math.Max(1, order.Items.Count);
            foreach (var item in order.Items)
            {
                db.Sales.Add(new Sale
                {
                    ReceiptNo = order.OrderNumber,
                    CustomerId = order.CustomerId,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalAmount = item.UnitPrice * item.Quantity,
                    Date = DateTime.Now,
                    PaymentMethod = "Cash on Delivery",
                    Channel = "Online",
                    LoyaltyPointsEarned = pointsEarned / itemCount
                });
            }

            if (customer is not null && pointsEarned > 0)
            {
                db.Loyalties.Add(new Loyalty
                {
                    CustomerId = customer.CustomerId,
                    PointsEarned = pointsEarned,
                    PointsRedeemed = 0,
                    Date = DateTime.Now,
                    Note = $"Earned from {order.OrderNumber} (COD collected)"
                });
                customer.LoyaltyPoints += pointsEarned;
                customer.Tier = LoyaltyRules.TierFor(customer.LoyaltyPoints);
            }

            db.SystemLogs.Add(Audit.Log(User.Email(),
                $"COD payment received on delivery for {order.OrderNumber} — ₱{order.Total:N0}" +
                (customer is null ? "" : $" · {customer.Name} +{pointsEarned} pts"), "Sales"));
        }

        db.SystemLogs.Add(Audit.Log(User.Email(), $"Order {order.OrderNumber} → {req.Status}", "Sales"));

        var (title, body) = req.Status switch
        {
            "Shipped" => ($"Order {order.OrderNumber} has shipped",
                isCod
                    ? $"Your COD package is on its way. Please prepare ₱{order.Total:N0} cash for the courier."
                    : "Your package is on its way — out for delivery soon."),
            "Out for Delivery" => ($"Order {order.OrderNumber} is out for delivery",
                isCod
                    ? $"The courier is bringing your package today. Please have ₱{order.Total:N0} ready for cash on delivery."
                    : "The courier is bringing your package today. Keep your phone handy!"),
            _ => ($"Order {order.OrderNumber} was delivered",
                isCod
                    ? $"Your COD order has arrived and payment of ₱{order.Total:N0} was collected. Enjoy your items!"
                    : "Your order has arrived. Enjoy your new pieces — and don't forget to redeem your points!")
        };

        if (order.CustomerId is int recipientCid)
        {
            var recipient = await db.Users.FirstOrDefaultAsync(u => u.CustomerId == recipientCid);
            if (recipient is not null)
                Notifications.Push(db, recipient.UserId, title, body, "Order", "dashboard/customer");
        }

        await db.SaveChangesAsync();
        return Ok(new { id = order.OrderNumber, order.Status });
    }
}
