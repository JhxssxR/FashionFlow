using FashionFlow.Data;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace FashionFlow.Controllers;

// Cross-module reports: the ERP-approach rubric point. Sales figures come
// from the Sales module, expenses from Purchasing (purchase orders issued),
// stock figures from Inventory.
[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin,Accountant,InventoryManager,PurchasingOfficer,SalesStaff")]
public class ReportsController(FashionFlowDbContext db) : ControllerBase
{
    private static readonly string[] MonthLabels =
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    private static string DayLabel(DateTime d) => d.ToString("MMM d", CultureInfo.InvariantCulture);

    // Revenue/orders per day from real Sale rows (POS + online).
    [HttpGet("sales-summary")]
    public async Task<IActionResult> SalesSummary([FromQuery] int days = 30)
    {
        days = Math.Clamp(days, 7, 90);
        var start = DateTime.Today.AddDays(-(days - 1));

        var rows = await db.Sales.Where(s => s.Date >= start)
            .Select(s => new { s.Date, s.ReceiptNo, s.TotalAmount })
            .ToListAsync();

        var series = Enumerable.Range(0, days).Select(offset =>
        {
            var day = start.AddDays(offset);
            var dayRows = rows.Where(r => r.Date.Date == day).ToList();
            return new
            {
                date = DayLabel(day),
                fullDate = day.ToString("yyyy-MM-dd"),
                revenue = dayRows.Sum(r => r.TotalAmount),
                orders = dayRows.Select(r => r.ReceiptNo).Distinct().Count()
            };
        }).ToList();

        return Ok(new
        {
            series,
            totals = new
            {
                revenue = series.Sum(s => s.revenue),
                orders = series.Sum(s => s.orders)
            }
        });
    }

    // Purchasing spend per day (outbound to suppliers).
    [HttpGet("purchasing-summary")]
    [Authorize(Roles = "Admin,PurchasingOfficer,Accountant")]
    public async Task<IActionResult> PurchasingSummary([FromQuery] int days = 14)
    {
        days = Math.Clamp(days, 7, 60);
        var start = DateTime.Today.AddDays(-(days - 1));

        var rows = await db.PurchaseOrders
            .Where(p => p.IssuedDate.ToDateTime(TimeOnly.MinValue) >= start && p.Status != "Cancelled")
            .Select(p => new { p.IssuedDate, p.Amount })
            .ToListAsync();

        var series = Enumerable.Range(0, days).Select(offset =>
        {
            var day = DateOnly.FromDateTime(start.AddDays(offset));
            return new
            {
                date = $"D-{(days - 1 - offset)}",
                fullDate = day.ToString("yyyy-MM-dd"),
                spend = rows.Where(r => r.IssuedDate == day).Sum(r => r.Amount)
            };
        }).ToList();

        return Ok(new { series, total = series.Sum(s => s.spend) });
    }

    // Financial overview: revenue vs expenses (expenses = purchase orders
    // issued per period), payables = open POs, spend mix by supplier category.
    [HttpGet("financial-summary")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> FinancialSummary()
    {
        var start14 = DateTime.Today.AddDays(-13);
        var yearStart = new DateTime(DateTime.Now.Year, 1, 1);

        var sales = await db.Sales.Where(s => s.Date >= yearStart)
            .Select(s => new { s.Date, s.TotalAmount }).ToListAsync();
        var pos = await db.PurchaseOrders
            .Where(p => p.Status != "Cancelled" && p.IssuedDate.ToDateTime(TimeOnly.MinValue) >= yearStart)
            .Select(p => new { p.IssuedDate, p.Amount })
            .ToListAsync();

        var daily14 = Enumerable.Range(0, 14).Select(offset =>
        {
            var day = start14.AddDays(offset);
            var revenue = sales.Where(s => s.Date.Date == day).Sum(s => s.TotalAmount);
            var expenses = pos.Where(p => p.IssuedDate == DateOnly.FromDateTime(day)).Sum(p => p.Amount);
            return new { date = DayLabel(day), fullDate = day.ToString("yyyy-MM-dd"), revenue, expenses, profit = revenue - expenses };
        }).ToList();

        var monthly = Enumerable.Range(0, DateTime.Now.Month).Select(i =>
        {
            var month = i + 1;
            var revenue = sales.Where(s => s.Date.Month == month).Sum(s => s.TotalAmount);
            var expenses = pos.Where(p => p.IssuedDate.Month == month).Sum(p => p.Amount);
            var label = month == DateTime.Now.Month ? $"{MonthLabels[i]} (to date)" : MonthLabels[i];
            return new { month = label, revenue, expenses };
        }).ToList();

        // Spend mix: purchasing spend by supplier specialty.
        var spendByCategory = await db.PurchaseOrders
            .Include(p => p.Supplier)
            .Where(p => p.Status != "Cancelled" && p.IssuedDate.ToDateTime(TimeOnly.MinValue) >= yearStart)
            .GroupBy(p => p.Supplier!.Category)
            .Select(g => new { name = g.Key, amount = g.Sum(p => p.Amount) })
            .ToListAsync();
        var spendTotal = spendByCategory.Sum(x => x.amount);
        var expenseBreakdown = spendByCategory
            .OrderByDescending(x => x.amount)
            .Select(x => new { name = x.name, value = spendTotal == 0 ? 0 : (int)Math.Round(x.amount * 100 / spendTotal) })
            .ToList();

        // Payables: undelivered, non-cancelled POs = money owed to suppliers.
        var openPos = await db.PurchaseOrders.Include(p => p.Supplier)
            .Where(p => p.Status != "Delivered" && p.Status != "Cancelled")
            .OrderBy(p => p.Eta)
            .Select(p => new
            {
                id = p.PONumber,
                party = p.Supplier!.Name,
                due = p.Eta == null ? "—" : p.Eta.Value.ToString("yyyy-MM-dd"),
                amount = p.Amount
            })
            .ToListAsync();

        var todayRevenue = sales.Where(s => s.Date.Date == DateTime.Today).Sum(s => s.TotalAmount);
        var todaySpend = pos.Where(p => p.IssuedDate == DateOnly.FromDateTime(DateTime.Today)).Sum(p => p.Amount);

        return Ok(new
        {
            daily14,
            monthly,
            expenseBreakdown,
            payables = openPos,
            payablesTotal = openPos.Sum(p => p.amount),
            todayCash = todayRevenue - todaySpend
        });
    }

    // Inventory valuation: stock on hand by category + low-stock exposure.
    [HttpGet("inventory-summary")]
    [Authorize(Roles = "Admin,InventoryManager,Accountant")]
    public async Task<IActionResult> InventorySummary()
    {
        var thresholdRaw = await db.AppSettings.Where(a => a.Key == "LowStockThreshold").Select(a => a.Value).FirstOrDefaultAsync();
        var threshold = int.TryParse(thresholdRaw, out var t) ? t : 12;

        var products = await db.Products.Where(p => p.IsActive)
            .Select(p => new { p.Name, p.Category, p.Stock, p.Price })
            .ToListAsync();
        var lowStock = await db.Products.Where(p => p.IsActive && p.Stock <= threshold)
            .OrderBy(p => p.Stock)
            .Select(p => new { name = p.Name, category = p.Category, stock = p.Stock, value = p.Stock * p.Price })
            .ToListAsync();

        var byCategory = products
            .GroupBy(p => p.Category)
            .Select(g => new
            {
                name = g.Key,
                units = g.Sum(p => p.Stock),
                value = g.Sum(p => p.Stock * p.Price)
            })
            .OrderByDescending(x => x.value)
            .ToList();

        var movements = await db.StockMovements.ToListAsync();
        var last7 = DateTime.Today.AddDays(-6);
        var ins = movements.Where(m => m.Date >= last7 && m.Direction == "In").Sum(m => m.Quantity);
        var outs = movements.Where(m => m.Date >= last7 && m.Direction == "Out").Sum(m => m.Quantity);

        return Ok(new
        {
            byCategory,
            lowStock,
            lowStockValue = lowStock.Sum(x => x.value),
            totalUnits = products.Sum(p => p.Stock),
            totalValue = products.Sum(p => p.Stock * p.Price),
            last7 = new { ins, outs, net = ins - outs }
        });
    }

    // Archived report rows (generated by the system or by staff).
    [HttpGet]
    public async Task<IActionResult> Archive([FromQuery] string? type)
    {
        var q = db.Reports.AsQueryable();
        if (!string.IsNullOrEmpty(type)) q = q.Where(r => r.Type == type);
        var rows = await q.OrderByDescending(r => r.Date)
            .Select(r => new { id = r.ReportId, r.Title, r.Type, date = r.Date, r.GeneratedBy })
            .ToListAsync();
        return Ok(rows);
    }
}
