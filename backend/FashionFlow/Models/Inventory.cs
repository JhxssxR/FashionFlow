namespace FashionFlow.Models;

public class Inventory
{
    public int InventoryId { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public string Warehouse { get; set; } = "Main Warehouse — Quezon City";
}
