using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize(Roles = "Admin,InventoryManager,PurchasingOfficer,Accountant")]
public class InventoryController(FashionFlowDbContext db) : ControllerBase
{
    private async Task<int> LowStockThresholdAsync()
    {
        var raw = await db.AppSettings.Where(a => a.Key == "LowStockThreshold").Select(a => a.Value).FirstOrDefaultAsync();
        return int.TryParse(raw, out var n) ? n : 12;
    }

    private static string DayLabel(DateTime d) => d.ToString("MMM d", System.Globalization.CultureInfo.InvariantCulture);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rows = await db.Inventories
            .Include(i => i.Product)
            .Where(i => i.Product!.IsActive)
            .OrderBy(i => i.ProductId)
            .Select(i => new
            {
                id = i.InventoryId,
                productId = i.ProductId,
                name = i.Product!.Name,
                variant = i.Product.Variant,
                category = i.Product.Category,
                price = i.Product.Price,
                stock = i.Product.Stock,
                i.Warehouse
            })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPost("adjust")]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<IActionResult> Adjust(AdjustStockRequest req)
    {
        var product = await db.Products.Include(p => p.Inventories).FirstOrDefaultAsync(p => p.ProductId == req.ProductId);
        if (product is null) return NotFound(new { message = "Product not found." });

        var old = product.Stock;
        if (req.NewQuantity == old)
            return BadRequest(new { message = "New quantity equals the current on-hand count." });

        product.Stock = req.NewQuantity;
        var inv = product.Inventories.FirstOrDefault();
        if (inv is not null)
        {
            var others = product.Inventories.Sum(i => i.Quantity) - inv.Quantity;
            inv.Quantity = req.NewQuantity - others;
        }

        db.StockMovements.Add(new StockMovement
        {
            ProductId = product.ProductId,
            Quantity = Math.Abs(req.NewQuantity - old),
            Direction = req.NewQuantity > old ? "In" : "Out",
            Date = DateTime.Now,
            Reference = "Adjustment"
        });
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"Stock adjustment: {product.Name} set to {req.NewQuantity} units{(string.IsNullOrEmpty(req.Note) ? "" : $" — {req.Note}")}", "Inventory"));
        await db.SaveChangesAsync();

        return Ok(new { ok = true, product.Stock });
    }

    [HttpGet("low-stock")]
    [Authorize(Roles = "Admin,InventoryManager,PurchasingOfficer,SalesStaff")]
    public async Task<IActionResult> LowStock()
    {
        var threshold = await LowStockThresholdAsync();
        var rows = await db.Products
            .Where(p => p.IsActive && p.Stock <= threshold)
            .OrderBy(p => p.Stock)
            .Select(p => new
            {
                id = p.ProductId,
                p.Name,
                p.Variant,
                p.Price,
                p.Stock,
                p.Category
            })
            .ToListAsync();
        return Ok(new { threshold, rows });
    }

    [HttpGet("movements")]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<IActionResult> Movements([FromQuery] int limit = 60)
    {
        var rows = await db.StockMovements
            .Include(m => m.Product)
            .OrderByDescending(m => m.Date)
            .Take(Math.Clamp(limit, 1, 200))
            .Select(m => new
            {
                id = m.MovementId,
                date = m.Date,
                product = m.Product!.Name,
                m.Direction,
                m.Quantity,
                m.Reference
            })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpGet("movement-series")]
    [Authorize(Roles = "Admin,InventoryManager,Accountant")]
    public async Task<IActionResult> MovementSeries([FromQuery] int days = 14)
    {
        days = Math.Clamp(days, 7, 60);
        var start = DateTime.Today.AddDays(-(days - 1));

        var raw = await db.StockMovements
            .Where(m => m.Date >= start)
            .Select(m => new { m.Date, m.Direction, m.Quantity })
            .ToListAsync();

        var series = Enumerable.Range(0, days).Select(offset =>
        {
            var day = start.AddDays(offset);
            var inUnits = raw.Where(m => m.Date.Date == day && m.Direction == "In").Sum(m => m.Quantity);
            var outUnits = raw.Where(m => m.Date.Date == day && m.Direction == "Out").Sum(m => m.Quantity);
            return new { date = DayLabel(day), fullDate = day.ToString("yyyy-MM-dd"), stockIn = inUnits, stockOut = outUnits };
        }).ToList();
        return Ok(series);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var threshold = await LowStockThresholdAsync();
        var capacityRaw = await db.AppSettings.Where(a => a.Key == "WarehouseCapacityUnits").Select(a => a.Value).FirstOrDefaultAsync();
        var capacity = int.TryParse(capacityRaw, out var c) && c > 0 ? c : 500;

        var products = await db.Products.Where(p => p.IsActive).ToListAsync();

        var warehouses = await db.Inventories
            .GroupBy(i => i.Warehouse)
            .Select(g => new { Name = g.Key, Skus = g.Count(), Units = g.Sum(i => i.Quantity) })
            .ToListAsync();

        var byCategory = products.GroupBy(p => p.Category)
            .OrderBy(g => g.Key)
            .Select(g => new { category = g.Key, stock = g.Sum(p => p.Stock) })
            .ToList();

        return Ok(new
        {
            activeSkus = products.Count,
            totalUnits = products.Sum(p => p.Stock),
            stockValue = products.Sum(p => p.Stock * p.Price),
            lowStockCount = products.Count(p => p.Stock <= threshold),
            byCategory,
            warehouses = warehouses.Select(w => new
            {
                name = w.Name,
                skus = w.Skus,
                units = w.Units,
                utilisation = Math.Min(100, (int)Math.Round(w.Units * 100.0 / capacity))
            })
        });
    }
}
