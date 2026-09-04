namespace FashionFlow.Models;

public class Product
{
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    // Size/colour variant, e.g. "Medium / Brown"
    public string Variant { get; set; } = "";
    public decimal Price { get; set; }
    public decimal? OriginalPrice { get; set; } // non-null → SALE badge on the storefront
    // Canonical on-hand units (Main Warehouse). Kept in sync with Inventory by
    // every stock transaction — never write one without the other.
    public int Stock { get; set; }
    // ERP category: Outerwear, Dresses, Bottoms, Shirts, Tops
    public string Category { get; set; } = "";
    // Storefront filter category: Women, Men, Outerwear
    public string StorefrontCategory { get; set; } = "";
    public string ImageUrl { get; set; } = "";
    public bool IsNew { get; set; }
    public bool IsActive { get; set; } = true;

    // Warehouse rows keeping Stock in sync (usually exactly one).
    public ICollection<Inventory> Inventories { get; set; } = [];
}
