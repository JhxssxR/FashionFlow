namespace FashionFlow.Models;

// An online store order (storefront cart → PayMongo). It is fulfilled into
// Sale rows (Channel = "Online") once payment is confirmed — mirroring how a
// POS charge writes Sales immediately.
public class Order
{
    public int OrderId { get; set; }
    // Continues the FF-1xxxx series used by the seeded online receipts.
    public string OrderNumber { get; set; } = "";
    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    // Guest checkouts carry their email here; logged-in customers link by CustomerId.
    public string GuestEmail { get; set; } = "";
    public string ShippingAddress { get; set; } = "";

    // PayMongo settles a checkout_session in one charge, so the order keeps
    // an items summary + totals instead of per-line pricing (OrderItems hold
    // the authoritative lines).
    public string ItemsSummary { get; set; } = "";
    public decimal Subtotal { get; set; }
    public decimal Total { get; set; }

    // Pending → Paid | Cancelled | Failed
    public string Status { get; set; } = "Pending";
    // PayMongo checkout_session id (cs_xxx) tying the webhook to this order.
    public string? CheckoutSessionId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public ICollection<OrderItem> Items { get; set; } = [];
}

public class OrderItem
{
    public int OrderItemId { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
