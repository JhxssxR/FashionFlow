using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(FashionFlowDbContext db) : ControllerBase
{
    // Public: the storefront catalog. Filters: category=Women|Men|Outerwear,
    // sale=1 (has OriginalPrice), new=1.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] string? category, [FromQuery] string? sale, [FromQuery] string? isNew)
    {
        var q = db.Products.Where(p => p.IsActive);
        if (!string.IsNullOrEmpty(category) && category != "All")
            q = q.Where(p => p.StorefrontCategory == category);
        if (sale == "1") q = q.Where(p => p.OriginalPrice != null);
        if (isNew == "1") q = q.Where(p => p.IsNew);

        var rows = await q.OrderBy(p => p.ProductId)
            .Select(p => new
            {
                id = p.ProductId,
                p.Name,
                p.Variant,
                p.Price,
                OriginalPrice = p.OriginalPrice,
                p.Stock,
                p.Category,
                storefrontCategory = p.StorefrontCategory,
                imageUrl = p.ImageUrl,
                p.IsNew
            })
            .ToListAsync();
        return Ok(rows);
    }

    // Product photo upload for the catalog form: validates type + size,
    // stores under wwwroot/uploads/products with a random filename (no path
    // traversal possible) and returns the URL to save on the product.
    [HttpPost("upload-image")]
    [Authorize(Roles = "Admin,InventoryManager")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(IFormFile file, [FromServices] IWebHostEnvironment env)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Choose an image file first." });
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Image must be 5MB or less." });
        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only image files (JPG, PNG, WebP, GIF)." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" }.Contains(ext))
            return BadRequest(new { message = "Only JPG, PNG, WebP or GIF images." });

        var dir = Path.Combine(env.WebRootPath ?? "wwwroot", "uploads", "products");
        Directory.CreateDirectory(dir);
        var name = $"{Guid.NewGuid():N}{ext}";
        await using var fs = System.IO.File.Create(Path.Combine(dir, name));
        await file.CopyToAsync(fs);
        return Ok(new { imageUrl = $"/uploads/products/{name}" });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<IActionResult> Create(SaveProductRequest req)
    {
        var product = new Product
        {
            Name = req.Name.Trim(),
            Variant = req.Variant.Trim(),
            Price = req.Price,
            OriginalPrice = req.OriginalPrice,
            Stock = req.Stock,
            Category = req.Category,
            StorefrontCategory = req.StorefrontCategory,
            ImageUrl = req.ImageUrl,
            IsNew = req.IsNew,
            IsActive = true
        };
        db.Products.Add(product);
        db.Inventories.Add(new Inventory
        {
            Product = product,
            Quantity = req.Stock,
            Warehouse = "Main Warehouse — Quezon City"
        });
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Product created: {product.Name} ({product.Variant}) — ₱{product.Price:N0}", "Inventory"));
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), new { id = product.ProductId },
            new { id = product.ProductId, product.Name });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<IActionResult> Update(int id, SaveProductRequest req)
    {
        var product = await db.Products.Include(p => p.Inventories).FirstOrDefaultAsync(p => p.ProductId == id);
        if (product is null) return NotFound(new { message = "Product not found." });

        var oldStock = product.Stock;
        product.Name = req.Name.Trim();
        product.Variant = req.Variant.Trim();
        product.Price = req.Price;
        product.OriginalPrice = req.OriginalPrice;
        product.Category = req.Category;
        product.StorefrontCategory = req.StorefrontCategory;
        product.ImageUrl = req.ImageUrl;
        product.IsNew = req.IsNew;

        if (req.Stock != oldStock)
        {
            product.Stock = req.Stock;
            var inv = product.Inventories.FirstOrDefault();
            if (inv is not null)
            {
                var others = product.Inventories.Sum(i => i.Quantity) - inv.Quantity;
                inv.Quantity = req.Stock - others;
            }
            db.StockMovements.Add(new StockMovement
            {
                ProductId = product.ProductId,
                Quantity = Math.Abs(req.Stock - oldStock),
                Direction = req.Stock > oldStock ? "In" : "Out",
                Date = DateTime.Now,
                Reference = "Adjustment"
            });
            db.SystemLogs.Add(Audit.Log(User.Email(),
                $"Stock adjustment: {product.Name} set to {req.Stock} units", "Inventory"));
        }
        else
        {
            db.SystemLogs.Add(Audit.Log(User.Email(), $"Product updated: {product.Name}", "Inventory"));
        }

        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.ProductId == id);
        if (product is null) return NotFound(new { message = "Product not found." });

        product.IsActive = false;
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Product removed from catalog: {product.Name}", "Inventory"));
        await db.SaveChangesAsync();
        return NoContent();
    }
}
