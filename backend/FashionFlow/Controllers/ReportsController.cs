using FashionFlow.Data;
using FashionFlow.Models;
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
    // Optional from/to (yyyy-MM-dd) bound the window; otherwise the last
    // `days` days are used. Range is capped at 90 days for chart sanity.
    [HttpGet("sales-summary")]
    public async Task<IActionResult> SalesSummary([FromQuery] int days = 30, [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
    {
        var end = to ?? DateOnly.FromDateTime(DateTime.Today);
        DateOnly startDate;
        if (from is not null)
        {
            startDate = from.Value;
            if (startDate > end) (startDate, end) = (end, startDate);
            if (end.DayNumber - startDate.DayNumber > 89) startDate = end.AddDays(-89);
        }
        else
        {
            days = Math.Clamp(days, 7, 90);
            startDate = end.AddDays(-(days - 1));
        }
        var spanDays = end.DayNumber - startDate.DayNumber + 1;
        var start = startDate.ToDateTime(TimeOnly.MinValue);
        var endExclusive = end.AddDays(1).ToDateTime(TimeOnly.MinValue);

        var rows = await db.Sales.Where(s => s.Date >= start && s.Date < endExclusive)
            .Select(s => new { s.Date, s.ReceiptNo, s.TotalAmount })
            .ToListAsync();

        var series = Enumerable.Range(0, spanDays).Select(offset =>
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

        // Item-level revenue: which specific products brought the money in.
        var itemRows = await db.Sales.Include(s => s.Product)
            .Where(s => s.Date >= start && s.Date < endExclusive)
            .Select(s => new
            {
                s.ProductId,
                Name = s.Product != null ? s.Product.Name : "Unknown item",
                Variant = s.Product != null ? s.Product.Variant : "—",
                s.Quantity,
                s.TotalAmount,
                s.ReceiptNo,
                s.Date
            })
            .ToListAsync();
        var windowRevenue = itemRows.Sum(r => r.TotalAmount);
        var byProduct = itemRows
            .GroupBy(r => new { r.ProductId, r.Name, r.Variant })
            .Select(g => new
            {
                id = g.Key.ProductId,
                name = g.Key.Name,
                variant = g.Key.Variant,
                units = g.Sum(x => x.Quantity),
                revenue = g.Sum(x => x.TotalAmount),
                orders = g.Select(x => x.ReceiptNo).Distinct().Count(),
                lastSold = g.Max(x => x.Date).ToString("yyyy-MM-dd"),
                share = windowRevenue == 0 ? 0 : Math.Round(g.Sum(x => x.TotalAmount) * 100 / windowRevenue, 1)
            })
            .OrderByDescending(x => x.revenue)
            .ToList();

        return Ok(new
        {
            series,
            byProduct,
            totals = new
            {
                revenue = series.Sum(s => s.revenue),
                orders = series.Sum(s => s.orders)
            }
        });
    }

    // Purchasing spend per day (outbound to suppliers). Optional from/to
    // (yyyy-MM-dd) bound the window; otherwise the last `days` days.
    [HttpGet("purchasing-summary")]
    [Authorize(Roles = "Admin,PurchasingOfficer,Accountant")]
    public async Task<IActionResult> PurchasingSummary([FromQuery] int days = 14, [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
    {
        var end = to ?? DateOnly.FromDateTime(DateTime.Today);
        DateOnly startDate;
        if (from is not null)
        {
            startDate = from.Value;
            if (startDate > end) (startDate, end) = (end, startDate);
            if (end.DayNumber - startDate.DayNumber > 59) startDate = end.AddDays(-59);
        }
        else
        {
            days = Math.Clamp(days, 7, 60);
            startDate = end.AddDays(-(days - 1));
        }
        var spanDays = end.DayNumber - startDate.DayNumber + 1;
        var start = startDate.ToDateTime(TimeOnly.MinValue);

        var rows = await db.PurchaseOrders
            .Where(p => p.IssuedDate.ToDateTime(TimeOnly.MinValue) >= start && p.IssuedDate.ToDateTime(TimeOnly.MinValue) < end.AddDays(1).ToDateTime(TimeOnly.MinValue) && p.Status != "Cancelled")
            .Select(p => new { p.IssuedDate, p.Amount })
            .ToListAsync();

        var series = Enumerable.Range(0, spanDays).Select(offset =>
        {
            var day = DateOnly.FromDateTime(start.AddDays(offset));
            return new
            {
                date = spanDays <= 31 ? DayLabel(day.ToDateTime(TimeOnly.MinValue)) : $"D-{(spanDays - 1 - offset)}",
                fullDate = day.ToString("yyyy-MM-dd"),
                spend = rows.Where(r => r.IssuedDate == day).Sum(r => r.Amount)
            };
        }).ToList();

        return Ok(new { series, total = series.Sum(s => s.spend) });
    }

    // Financial overview: revenue vs expenses (expenses = purchase orders
    // issued per period), payables = open POs, spend mix by supplier category.
    // The daily window accepts from/to (yyyy-MM-dd, capped at 90 days);
    // monthly and breakdown figures stay year-to-date.
    [HttpGet("financial-summary")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> FinancialSummary([FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
    {
        var endDate = to ?? DateOnly.FromDateTime(DateTime.Today);
        var startDate = from ?? endDate.AddDays(-13);
        if (startDate > endDate) (startDate, endDate) = (endDate, startDate);
        if (endDate.DayNumber - startDate.DayNumber > 89) startDate = endDate.AddDays(-89);
        var spanDays = endDate.DayNumber - startDate.DayNumber + 1;
        var start14 = startDate.ToDateTime(TimeOnly.MinValue);
        var yearStart = new DateTime(DateTime.Now.Year, 1, 1);

        var sales = await db.Sales.Where(s => s.Date >= yearStart)
            .Select(s => new { s.Date, s.TotalAmount }).ToListAsync();
        var pos = await db.PurchaseOrders
            .Where(p => p.Status != "Cancelled" && p.IssuedDate.ToDateTime(TimeOnly.MinValue) >= yearStart)
            .Select(p => new { p.IssuedDate, p.Amount })
            .ToListAsync();

        var daily14 = Enumerable.Range(0, spanDays).Select(offset =>
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

    // Generate and save a new report snapshot in the archive
    [HttpPost]
    [Authorize(Roles = "Admin,Accountant,InventoryManager,PurchasingOfficer")]
    public async Task<IActionResult> CreateReport(CreateReportRequest req)
    {
        var validTypes = new[] { "Sales", "Inventory", "Financial", "Purchasing" };
        var type = validTypes.FirstOrDefault(t => string.Equals(t, req.Type?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (type == null)
            return BadRequest(new { message = "Report type must be Sales, Inventory, Financial, or Purchasing." });

        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Report title is required." });

        var report = new Report
        {
            Title = req.Title.Trim(),
            Type = type,
            Date = DateTime.Now,
            GeneratedBy = User.Email()
        };

        db.Reports.Add(report);
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Generated and archived {type} report: \"{report.Title}\"", "Reports"));
        await db.SaveChangesAsync();

        return StatusCode(201, new
        {
            id = report.ReportId,
            title = report.Title,
            type = report.Type,
            date = report.Date,
            generatedBy = report.GeneratedBy
        });
    }

    // Delete an archived report from the system
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> DeleteReport(int id)
    {
        var report = await db.Reports.FindAsync(id);
        if (report == null) return NotFound(new { message = "Report not found." });

        db.Reports.Remove(report);
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Deleted archived report #{id}: \"{report.Title}\"", "Reports"));
        await db.SaveChangesAsync();

        return Ok(new { message = "Report deleted." });
    }
}
