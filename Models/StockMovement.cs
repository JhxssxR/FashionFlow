namespace FashionFlow.Models;

public class StockMovement
{
    public int MovementId { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    // In (receiving) | Out (sale)
    public string Direction { get; set; } = "In";
    public DateTime Date { get; set; }
    // Receipt number, PO number or "Adjustment"
    public string Reference { get; set; } = "";
}
