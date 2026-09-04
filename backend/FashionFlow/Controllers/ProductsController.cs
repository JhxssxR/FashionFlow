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
