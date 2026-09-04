using FashionFlow.Data;
using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Services;

// Shared purchasing logic used by both the Purchasing dashboard
// (PurchaseOrdersController) and the Supplier Portal (PortalController):
// marking a PO Delivered physically increases stock, records the stock
// movement and writes an audit log — the ERP connection between the
// Purchasing, Inventory and Supplier modules.
public static class PurchaseService
{
    // Forward-only pipeline: Pending → Confirmed → In Transit → Delivered.
    private static readonly string[] Pipeline = ["Pending", "Confirmed", "In Transit", "Delivered"];

    public static bool IsValidTransition(string from, string to) =>
        Array.IndexOf(Pipeline, to) == Array.IndexOf(Pipeline, from) + 1;

    public static async Task ReceiveAsync(FashionFlowDbContext db, PurchaseOrder po, string actorEmail)
    {
        po.Status = "Delivered";
        po.DeliveredDate = DateOnly.FromDateTime(DateTime.Today);

        var product = await db.Products.FirstAsync(p => p.ProductId == po.ProductId);
        product.Stock += po.Quantity;

        var inv = await db.Inventories.FirstOrDefaultAsync(i => i.ProductId == po.ProductId);
        if (inv is not null) inv.Quantity += po.Quantity;

        db.StockMovements.Add(new StockMovement
        {
            ProductId = po.ProductId,
            Quantity = po.Quantity,
            Direction = "In",
            Date = DateTime.Now,
            Reference = po.PONumber
        });

        db.SystemLogs.Add(Audit.Log(actorEmail,
            $"Delivery completed: {po.PONumber} — {product.Name} ×{po.Quantity} received into stock", "Supplier"));
    }
}
