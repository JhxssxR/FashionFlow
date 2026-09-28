namespace FashionFlow.Models;

public class Sale
{
    public int SaleId { get; set; }
    public string ReceiptNo { get; set; } = "";
    public int? CustomerId { get; set; } // null → walk-in
    public Customer? Customer { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime Date { get; set; }
    // Cash | Card | GCash
    public string PaymentMethod { get; set; } = "Cash";
    // GCash reference number for POS GCash sales (typed by the cashier from
    // the customer's phone) — null for Cash and legacy rows.
    public string? PaymentRefNo { get; set; }
    // POS | Online
    public string Channel { get; set; } = "POS";
    public int LoyaltyPointsEarned { get; set; }
}
