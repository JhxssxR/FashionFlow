using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

// The Supplier Portal: every route is scoped to the logged-in supplier's
// SupplierId claim, so a supplier can only ever see their own orders.
[ApiController]
[Route("api/portal")]
[Authorize(Roles = "Supplier,Admin")]
public class PortalController(FashionFlowDbContext db) : ControllerBase
{
    private async Task<int?> ResolveSupplierIdAsync()
    {
        if (User.SupplierId() is int sid) return sid;
        // Admin fallback: first supplier id from the query string.
        if (User.IsInRole("Admin") && Request.Query.TryGetValue("supplierId", out var raw)
            && int.TryParse(raw, out var parsed)) return parsed;
        return null;
    }

    [HttpGet("purchase-orders")]
    public async Task<IActionResult> MyOrders()
    {
        var sid = await ResolveSupplierIdAsync();
        if (sid is null) return Conflict(new { message = "This account is not linked to a supplier profile." });

        var rows = await db.PurchaseOrders.Include(p => p.Product)
            .Where(p => p.SupplierId == sid)
            .OrderByDescending(p => p.IssuedDate)
            .Select(p => new
            {
                id = p.PONumber,
                purchaseId = p.PurchaseId,
                productName = p.Product!.Name,
                quantity = p.Quantity,
                unitCost = p.UnitCost,
                amount = p.Amount,
                p.Status,
                issuedDate = p.IssuedDate.ToString("yyyy-MM-dd"),
                eta = p.Eta == null ? null : p.Eta.Value.ToString("yyyy-MM-dd"),
                deliveredDate = p.DeliveredDate == null ? null : p.DeliveredDate.Value.ToString("yyyy-MM-dd")
            })
            .ToListAsync();
        return Ok(rows);
    }

    // Accept / prepare / ship / deliver — forward-only transitions. Marking a
    // PO Delivered triggers the same stock-receiving path the Purchasing
    // module uses (PurchaseService), connecting the portal to Inventory.
    [HttpPut("purchase-orders/{purchaseId:int}/status")]
    public async Task<IActionResult> UpdateStatus(int purchaseId, UpdateStatusRequest req)
    {
        var sid = await ResolveSupplierIdAsync();
        if (sid is null) return Conflict(new { message = "This account is not linked to a supplier profile." });

        var po = await db.PurchaseOrders.Include(p => p.Product).Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.PurchaseId == purchaseId && p.SupplierId == sid);
        if (po is null) return NotFound(new { message = "Purchase order not found for your company." });
        if (po.Status == "Cancelled" || po.Status == "Delivered")
            return Conflict(new { message = $"A {po.Status.ToLowerInvariant()} order can no longer change status." });
        if (!PurchaseService.IsValidTransition(po.Status, req.Status))
            return Conflict(new { message = $"Cannot move from {po.Status} to {req.Status}. Follow Pending → Confirmed → In Transit → Delivered." });

        if (req.Status == "Delivered")
        {
            await PurchaseService.ReceiveAsync(db, po, User.Email());
        }
        else
        {
            po.Status = req.Status;
            db.SystemLogs.Add(Audit.Log(User.Email(),
                $"{po.PONumber} status → {req.Status} (supplier: {po.Supplier!.Name})", "Supplier"));
        }

        await db.SaveChangesAsync();
        return Ok(new { id = po.PONumber, po.Status });
    }

    [HttpGet("payments")]
    public async Task<IActionResult> Payments()
    {
        var sid = await ResolveSupplierIdAsync();
        if (sid is null) return Conflict(new { message = "This account is not linked to a supplier profile." });

        var delivered = await db.PurchaseOrders.Include(p => p.Product)
            .Where(p => p.SupplierId == sid && p.Status == "Delivered")
            .OrderByDescending(p => p.DeliveredDate)
            .Select(p => new
            {
                id = p.PONumber,
                items = p.Product!.Name + " ×" + p.Quantity,
                amount = p.Amount,
                status = p.Status,
                deliveredDate = p.DeliveredDate == null ? null : p.DeliveredDate.Value.ToString("yyyy-MM-dd")
            })
            .ToListAsync();

        return Ok(new
        {
            lifetimeDelivered = delivered.Sum(d => d.amount),
            rows = delivered
        });
    }

    // The supplier's offered catalog, derived from real purchase orders with
    // that supplier: last unit cost, smallest ordered quantity (MOQ) and
    // average lead time on delivered orders.
    [HttpGet("catalog")]
    public async Task<IActionResult> Catalog()
    {
        var sid = await ResolveSupplierIdAsync();
        if (sid is null) return Conflict(new { message = "This account is not linked to a supplier profile." });

        var pos = await db.PurchaseOrders.Include(p => p.Product)
            .Where(p => p.SupplierId == sid)
            .OrderByDescending(p => p.IssuedDate)
            .ToListAsync();

        var rows = pos.GroupBy(p => p.ProductId).Select(g =>
        {
            var latest = g.First();
            var delivered = g.Where(p => p.DeliveredDate is not null).ToList();
            int? leadDays = delivered.Count == 0
                ? null
                : (int)Math.Round(delivered.Average(p => (p.DeliveredDate!.Value.DayNumber - p.IssuedDate.DayNumber)));
            return new
            {
                name = latest.Product!.Name,
                variant = latest.Product.Variant,
                lastUnitCost = latest.UnitCost,
                moq = g.Min(p => p.Quantity),
                leadTime = leadDays is null ? "—" : $"{leadDays} days"
            };
        }).OrderBy(r => r.name).ToList();

        return Ok(rows);
    }
}
