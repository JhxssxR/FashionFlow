namespace FashionFlow.Models;

// A supplier's quoted offer for one product: their unit cost plus an extra
// discount percent. Master data (like the supplier companies themselves) —
// it powers the purchasing price comparison without fabricating orders.
// Effective price = UnitCost × (1 − DiscountPct / 100).
public class SupplierPrice
{
    public int SupplierPriceId { get; set; }
    public int SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    // Quoted unit cost before the discount below.
    public decimal UnitCost { get; set; }
    // Extra discount percent, 0–90.
    public decimal DiscountPct { get; set; }
    public DateTime UpdatedAt { get; set; }
}
