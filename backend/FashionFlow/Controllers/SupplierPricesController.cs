using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

// Supplier quotation price lists: each supplier's per-item cost + discount,
// maintained by Purchasing. Powers the price comparison (cheapest effective
// price wins) and prefills purchase orders.
[ApiController]
[Route("api/supplier-prices")]
[Authorize(Roles = "Admin,PurchasingOfficer")]
public class SupplierPricesController(FashionFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? supplierId)
    {
        var q = db.SupplierPrices.Include(x => x.Supplier).Include(x => x.Product).AsQueryable();
        if (supplierId is int sid) q = q.Where(x => x.SupplierId == sid);

        var rows = await q.ToListAsync();
        return Ok(rows
            .OrderBy(x => x.Supplier!.Name)
            .ThenBy(x => x.Product!.Name)
            .Select(x => new
            {
                id = x.SupplierPriceId,
                supplierId = x.SupplierId,
                supplier = x.Supplier!.Name,
                productId = x.ProductId,
                product = x.Product!.Name + " — " + x.Product!.Variant,
                unitCost = x.UnitCost,
                discountPct = x.DiscountPct,
                effective = Math.Round(x.UnitCost * (1 - x.DiscountPct / 100)),
                updated = x.UpdatedAt.ToString("yyyy-MM-dd")
            }));
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(SaveSupplierPriceRequest req)
    {
        var supplier = await db.Suppliers.FindAsync(req.SupplierId);
        if (supplier is null) return NotFound(new { message = "Supplier not found." });
        var product = await db.Products.FindAsync(req.ProductId);
        if (product is null || !product.IsActive) return NotFound(new { message = "Product not found." });

        var row = await db.SupplierPrices
            .FirstOrDefaultAsync(x => x.SupplierId == req.SupplierId && x.ProductId == req.ProductId);
        if (row is null)
        {
            row = new SupplierPrice { SupplierId = req.SupplierId, ProductId = req.ProductId };
            db.SupplierPrices.Add(row);
        }
        row.UnitCost = req.UnitCost;
        row.DiscountPct = req.DiscountPct;
        row.UpdatedAt = DateTime.Now;
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"Price list: {supplier.Name} — {product.Name} at ₱{req.UnitCost:N0} (−{req.DiscountPct}%)", "Purchasing"));
        await db.SaveChangesAsync();
        return Ok(new { id = row.SupplierPriceId });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var row = await db.SupplierPrices.Include(x => x.Supplier).Include(x => x.Product)
            .FirstOrDefaultAsync(x => x.SupplierPriceId == id);
        if (row is null) return NotFound(new { message = "Price entry not found." });
        db.SupplierPrices.Remove(row);
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"Price list removed: {row.Supplier!.Name} — {row.Product!.Name}", "Purchasing"));
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
