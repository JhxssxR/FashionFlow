namespace FashionFlow.Models;

public class PurchaseOrder
{
    public int PurchaseId { get; set; }
    public string PONumber { get; set; } = "";
    public int SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal Amount { get; set; }
    // Pending | Confirmed | In Transit | Delivered | Cancelled
    public string Status { get; set; } = "Pending";
    public DateOnly IssuedDate { get; set; }
    public DateOnly? Eta { get; set; }
    public DateOnly? DeliveredDate { get; set; }
}
