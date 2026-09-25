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
    // Store policy: GCash and Cash on Delivery only.
    private static readonly Dictionary<string, (string Label, string[] Types)> PaymentMethods =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["gcash"] = ("GCash", ["gcash"]),
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
        var methodKey = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "gcash" : req.PaymentMethod.Trim().ToLowerInvariant();
        if (methodKey == "cashondelivery") methodKey = "cod";
        // Store policy: GCash and Cash on Delivery only — anything else
        // (maya, card, online) is rejected, not silently offered.
        if (!PaymentMethods.ContainsKey(methodKey))
            return BadRequest(new { message = "We currently accept GCash and Cash on Delivery only." });
        var chosen = PaymentMethods[methodKey];

        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "Only customer accounts can place orders. Register or sign in first." });
        var customer = await db.Customers.FindAsync(customerId);
        if (customer is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        // Remember the typed address for next time (Google sign-ups never
        // gave one): fill the profile street only while it has no address
        // yet, so structured signup addresses are never clobbered. The next
        // checkout then prefills it via /api/auth/me.
        if (string.IsNullOrWhiteSpace(customer.Address) && !string.IsNullOrWhiteSpace(req.ShippingAddress))
            customer.Address = req.ShippingAddress.Trim();

        // Idempotency: a retried or double-clicked checkout carries the
        // client's key. If the first attempt already created the order,
        // return it instead of cloning it (no duplicate FF- numbers, no
        // double stock reservation).
        IActionResult ExistingOrderResponse(Order existing, string method)
        {
            if (method == "cod") return StatusCode(201, new { orderNumber = existing.OrderNumber, cod = true });
            if (method == "gcash") return StatusCode(201, new { orderNumber = existing.OrderNumber, qrPay = true, total = existing.Total });
            if (existing.CheckoutSessionId is not null)
                return Conflict(new { message = "This order is already being processed." });
            if (env.IsDevelopment())
                return StatusCode(201, new { orderNumber = existing.OrderNumber, checkoutUrl = $"{PublicBaseUrl}/#checkout/mock-pay/{existing.OrderNumber}/{method}", mock = true });
            return StatusCode(503, new { message = "Online payments are not configured yet (missing PayMongo:SecretKey)." });
        }

        var idemKey = string.IsNullOrWhiteSpace(req.IdempotencyKey) ? null : req.IdempotencyKey.Trim();
        if (idemKey is not null)
        {
            var existing = await db.Orders
                .FirstOrDefaultAsync(o => o.IdempotencyKey == idemKey && o.CustomerId == customer.CustomerId);
            if (existing is not null) return ExistingOrderResponse(existing, methodKey);
        }

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
            IdempotencyKey = idemKey,
            ItemsSummary = string.Join(", ", merged.Select(m => $"{products[m.ProductId].Name} ×{m.Quantity}")),
            Subtotal = subtotal,
            Discount = discount,
            PromoCode = appliedPromo?.Code,
            Total = subtotal - discount,
            Status = "Pending",
            PaymentMethod = chosen.Label,
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

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException) when (idemKey is not null)
        {
            // Lost a simultaneous race: the twin request committed first —
            // serve its order instead of surfacing a constraint error.
            var twin = await db.Orders
                .FirstOrDefaultAsync(o => o.IdempotencyKey == idemKey && o.CustomerId == customer.CustomerId);
            if (twin is not null) return ExistingOrderResponse(twin, methodKey);
            throw;
        }

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

        // GCash QR flow (manual, no gateway): the storefront shows the store
        // QR, the customer pays in their GCash app, then submits the reference
        // number + receipt for staff verification. Stock is reserved at
        // verification time (fulfilment re-checks and fails gracefully).
        if (methodKey == "gcash")
        {
            await db.SaveChangesAsync();
            return StatusCode(201, new { orderNumber = orderNumber, qrPay = true, total = order.Total });
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
                    chosen.Types);
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
                checkoutUrl = $"{PublicBaseUrl}/#checkout/mock-pay/{orderNumber}/{methodKey}",
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

    // Single order with QR settings for the GCash pay page. Customers see
    // only their own orders; staff see any order.
    [HttpGet("orders/{orderNumber}")]
    [Authorize(Roles = "Customer,Admin,SalesStaff,InventoryManager,Accountant")]
    public async Task<IActionResult> GetOne(string orderNumber)
    {
        var order = await db.Orders.Include(o => o.Customer).Include(o => o.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order is null) return NotFound(new { message = "Order not found." });
        if (User.IsInRole("Customer") && User.CustomerId() != order.CustomerId)
            return StatusCode(403, new { message = "This is not your order." });

        var settings = await db.AppSettings
            .Where(a => a.Key == "GcashQrImageUrl" || a.Key == "GcashAccountName" || a.Key == "GcashAccountNumber")
            .ToDictionaryAsync(a => a.Key, a => a.Value);
        return Ok(new
        {
            id = order.OrderNumber,
            date = order.CreatedAt,
            customer = order.Customer == null ? order.GuestEmail : order.Customer.Name,
            items = order.ItemsSummary,
            lines = order.Items.Select(i => new { name = i.Product == null ? "Item" : i.Product.Name, quantity = i.Quantity, unitPrice = i.UnitPrice }),
            subtotal = order.Subtotal,
            discount = order.Discount,
            total = order.Total,
            paymentMethod = order.PaymentMethod,
            status = order.Status,
            refNo = order.PaymentRefNo,
            hasReceipt = !string.IsNullOrEmpty(order.ReceiptImage),
            qr = new
            {
                imageUrl = settings.GetValueOrDefault("GcashQrImageUrl", "/assets/payments/gcash.png"),
                accountName = settings.GetValueOrDefault("GcashAccountName", "FashionFlow"),
                accountNumber = settings.GetValueOrDefault("GcashAccountNumber", "")
            }
        });
    }

    // Customer submits GCash proof: reference number + optional receipt shot.
    // Moves the order Pending → Awaiting Verification for staff to check.
    [HttpPost("orders/{orderNumber}/payment-proof")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> SubmitProof(string orderNumber, SubmitProofRequest req)
    {
        var customerId = User.CustomerId();
        var order = await db.Orders.FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order is null) return NotFound(new { message = "Order not found." });
        if (customerId is null || order.CustomerId != customerId)
            return StatusCode(403, new { message = "This is not your order." });
        if (!order.PaymentMethod.Contains("gcash", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Payment proof is only for GCash orders." });
        if (order.Status != "Pending" && order.Status != "Awaiting Verification")
            return Conflict(new { message = $"Order is already {order.Status} — no proof needed." });

        var refNo = (req.RefNo ?? "").Trim();
        if (refNo.Length < 4 || refNo.Length > 64)
            return BadRequest(new { message = "Enter the GCash reference number (at least 4 characters)." });
        if (!string.IsNullOrEmpty(req.ReceiptImage))
        {
            if (!req.ReceiptImage.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Receipt must be an image file." });
            if (req.ReceiptImage.Length > 2_800_000)
                return BadRequest(new { message = "Receipt image is too large — 2MB max." });
            order.ReceiptImage = req.ReceiptImage;
        }

        order.PaymentRefNo = refNo;
        order.Status = "Awaiting Verification";
        order.ProofSubmittedAt = DateTime.Now;
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"Payment proof submitted for {order.OrderNumber} — ref {refNo} (₱{order.Total:N0})", "Sales"));
        await Notifications.PushRolesAsync(db, ["Admin", "SalesStaff"],
            $"Payment to verify: {order.OrderNumber}",
            $"GCash ref {refNo} — ₱{order.Total:N0}. Open Online Orders to verify.",
            "Order", "dashboard/admin/orders");
        await db.SaveChangesAsync();
        return Ok(new { id = order.OrderNumber, status = order.Status });
    }

    // Staff verdict on submitted proof. Approve → fulfilled as a Paid sale
    // (stock re-checked); Reject → back to Pending for resubmission.
    [HttpPost("orders/{orderNumber}/verify-payment")]
    [Authorize(Roles = "Admin,SalesStaff,InventoryManager")]
    public async Task<IActionResult> VerifyPayment(string orderNumber, VerifyPaymentRequest req)
    {
        var order = await db.Orders.Include(o => o.Items).ThenInclude(i => i.Product).ThenInclude(p => p!.Inventories)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order is null) return NotFound(new { message = "Order not found." });
        if (order.Status != "Awaiting Verification")
            return Conflict(new { message = $"Order is {order.Status} — nothing to verify." });

        if (!req.Approved)
        {
            order.Status = "Pending";
            db.SystemLogs.Add(Audit.Log(User.Email(),
                $"Payment proof REJECTED for {order.OrderNumber} (ref {order.PaymentRefNo})" +
                (string.IsNullOrWhiteSpace(req.Note) ? "" : $" — {req.Note}"), "Sales"));
            if (order.CustomerId is int rcid)
            {
                var racc = await db.Users.FirstOrDefaultAsync(u => u.CustomerId == rcid);
                if (racc is not null)
                    Notifications.Push(db, racc.UserId,
                        $"Payment for {order.OrderNumber} needs attention",
                        "Our team could not verify your proof. Please check the ref number and resubmit.",
                        "Order", "dashboard/customer");
            }
            await db.SaveChangesAsync();
            return Ok(new { id = order.OrderNumber, status = order.Status });
        }

        await using var tx = await db.Database.BeginTransactionAsync();
        var error = await fulfillment.FulfillAsync(order, User.Email(), "GCash");
        await tx.CommitAsync();
        return error is null
            ? Ok(new { id = order.OrderNumber, status = order.Status })
            : Conflict(new { message = error, status = order.Status });
    }

    // Staff-only: the submitted reference + receipt image for verification.
    [HttpGet("orders/{orderNumber}/receipt")]
    [Authorize(Roles = "Admin,SalesStaff,InventoryManager,Accountant")]
    public async Task<IActionResult> Receipt(string orderNumber)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order is null) return NotFound(new { message = "Order not found." });
        return Ok(new
        {
            id = order.OrderNumber,
            total = order.Total,
            paymentMethod = order.PaymentMethod,
            status = order.Status,
            refNo = order.PaymentRefNo,
            receiptImage = order.ReceiptImage,
            proofAt = order.ProofSubmittedAt
        });
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
                refNo = o.PaymentRefNo,
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
                o.Status,
                refNo = o.PaymentRefNo,
                hasReceipt = o.ReceiptImage != null
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
