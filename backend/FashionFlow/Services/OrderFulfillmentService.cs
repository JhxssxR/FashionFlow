using FashionFlow.Data;
using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Services;

// Turns a paid online Order into real Sales/stock/loyalty movements — the
// same pipeline the POS charge uses (SaleService). Called from the PayMongo
// webhook and the Development-only mock confirm endpoint.
public class OrderFulfillmentService(FashionFlowDbContext db, SaleService sales)
{
    // Returns null on success, or an error message (e.g. stock shortfall).
    public async Task<string?> FulfillAsync(Order order, string actorEmail)
    {
        if (order.Status == "Paid") return null; // idempotent

        var lines = await db.OrderItems.Include(i => i.Product).ThenInclude(p => p!.Inventories)
            .Where(i => i.OrderId == order.OrderId)
            .Select(i => new { Item = i, Product = i.Product! })
            .ToListAsync();

        foreach (var line in lines)
        {
            if (line.Product.Stock < line.Item.Quantity)
            {
                order.Status = "Failed";
                db.SystemLogs.Add(Audit.Log(actorEmail,
                    $"Order {order.OrderNumber} failed — insufficient stock for {line.Product.Name}", "Sales"));
                await db.SaveChangesAsync();
                return $"Insufficient stock for {line.Product.Name}.";
            }
        }

        var customer = order.CustomerId is int cid ? await db.Customers.FindAsync(cid) : null;
        var saleLines = lines.Select(l => (l.Product, l.Item.Quantity)).ToList();

        var (_, total, points) = await sales.RecordSaleAsync(
            customer,
            saleLines,
            paymentMethod: "Online",
            channel: "Online",
            receiptNo: order.OrderNumber,
            when: DateTime.Now,
            discount: 0,
            actorEmail);

        order.Status = "Paid";
        order.PaidAt = DateTime.Now;
        db.SystemLogs.Add(Audit.Log(actorEmail,
            $"Payment received for {order.OrderNumber} — fulfilled as sales (₱{total:N0})", "Sales"));
        await db.SaveChangesAsync();
        return null;
    }
}
