using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize(Roles = "Admin,PurchasingOfficer,InventoryManager,Accountant")]
public class PurchaseOrdersController(FashionFlowDbContext db) : ControllerBase
{
    private static readonly string[] ValidStatuses = ["Pending", "Confirmed", "In Transit", "Delivered", "Cancelled"];

    // In-memory mapping: the dashboards want display-ready rows and the data
    // set is tiny, so load the page of POs then shape them.
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int? supplierId)
    {
        var q = db.PurchaseOrders.Include(p => p.Supplier).Include(p => p.Product).AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(p => p.Status == status);
        if (supplierId is int sid) q = q.Where(p => p.SupplierId == sid);

        var rows = await q.OrderByDescending(p => p.IssuedDate).ThenByDescending(p => p.PurchaseId)
            .Select(p => new
            {
                id = p.PONumber,
                purchaseId = p.PurchaseId,
                supplier = p.Supplier!.Name,
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

    [HttpPost]
    [Authorize(Roles = "Admin,PurchasingOfficer")]
    public async Task<IActionResult> Create(CreatePurchaseOrderRequest req)
    {
        var supplier = await db.Suppliers.FindAsync(req.SupplierId);
        var product = await db.Products.FindAsync(req.ProductId);
        if (supplier is null || product is null)
            return NotFound(new { message = "Supplier or product not found." });

        var year = DateTime.Now.Year;
        var prefix = $"PO-{year}-";
        var existing = await db.PurchaseOrders
            .Where(p => p.PONumber.StartsWith(prefix))
            .Select(p => p.PONumber)
            .ToListAsync();
        var nextSeq = existing.Count == 0 ? 1
            : existing.Select(s => int.TryParse(s.AsSpan(prefix.Length), out var n) ? n : 0).Max() + 1;

        var po = new PurchaseOrder
        {
            PONumber = $"{prefix}{nextSeq:D4}",
            SupplierId = req.SupplierId,
            ProductId = req.ProductId,
            Quantity = req.Quantity,
            UnitCost = req.UnitCost,
            Amount = req.Quantity * req.UnitCost,
            Status = "Pending",
            IssuedDate = DateOnly.FromDateTime(DateTime.Today),
            Eta = req.Eta
        };
        db.PurchaseOrders.Add(po);
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"{po.PONumber} created for {supplier.Name} — {product.Name} ×{req.Quantity}", "Purchasing"));
        await db.SaveChangesAsync();

        return StatusCode(201, new { id = po.PONumber, purchaseId = po.PurchaseId, po.Amount, po.Status });
    }

    [HttpPut("{purchaseId:int}/status")]
    [Authorize(Roles = "Admin,PurchasingOfficer")]
    public async Task<IActionResult> SetStatus(int purchaseId, UpdateStatusRequest req)
    {
        var po = await db.PurchaseOrders.Include(p => p.Product).Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.PurchaseId == purchaseId);
        if (po is null) return NotFound(new { message = "Purchase order not found." });
        if (!ValidStatuses.Contains(req.Status))
            return BadRequest(new { message = $"Status must be one of: {string.Join(", ", ValidStatuses)}." });
        if (po.Status == req.Status)
            return BadRequest(new { message = $"Order is already {req.Status}." });
        if (po.Status == "Cancelled" || po.Status == "Delivered")
            return Conflict(new { message = $"A {po.Status.ToLowerInvariant()} order can no longer change status." });

        if (req.Status == "Delivered")
        {
            await PurchaseService.ReceiveAsync(db, po, User.Email());
        }
        else
        {
            po.Status = req.Status;
            db.SystemLogs.Add(Audit.Log(User.Email(),
                $"{po.PONumber} status → {req.Status} ({po.Supplier!.Name})", "Purchasing"));
        }

        await db.SaveChangesAsync();
        return Ok(new { id = po.PONumber, po.Status });
    }
}
