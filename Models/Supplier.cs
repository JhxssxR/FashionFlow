namespace FashionFlow.Models;

public class Supplier
{
    public int SupplierId { get; set; }
    public string Name { get; set; } = "";
    public string Contact { get; set; } = "";
    public string Email { get; set; } = "";
    public string Category { get; set; } = "";
    public string Address { get; set; } = "";
    public decimal Rating { get; set; }
    public int OnTimeRate { get; set; }
}
