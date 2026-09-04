using FashionFlow.Data;
using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Services;

// The sale pipeline shared by the POS charge (SalesController) and online
// order fulfilment (PaymentsController webhook): writes the Sale lines,
// decrements stock, records the movements and awards loyalty points.
// Callers own validation, transaction and receipt numbering.
public class SaleService(FashionFlowDbContext db)
{
    // totalPointsOverride: when set (POS), the receipt awards exactly that many
    // points for the discounted total, allocated proportionally across lines;
    // otherwise points accrue per line at the standard rate (online orders).
    public async Task<(decimal Subtotal, decimal Total, int PointsEarned)> RecordSaleAsync(
        Customer? customer,
        IReadOnlyList<(Product Product, int Quantity)> lines,
        string paymentMethod,
        string channel,
        string receiptNo,
        DateTime when,
        decimal discount = 0,
        string actorEmail = "system",
        int? totalPointsOverride = null,
        string? logNote = null)
    {
        var subtotal = lines.Sum(l => l.Product.Price * l.Quantity);
        var total = subtotal - discount;

        var pointsEarned = totalPointsOverride ?? (customer is null ? 0 : LoyaltyRules.PointsFor(total));

        // Per-line stamps are allocated proportionally so a receipt's lines
        // sum exactly to the receipt's award.
        var lineTotals = lines.Select(l => l.Product.Price * l.Quantity).ToList();
        var linePoints = new int[lines.Count];
        if (customer is not null && pointsEarned > 0)
        {
            var allocated = 0;
            for (var i = 0; i < lines.Count - 1; i++)
            {
                linePoints[i] = total > 0 ? (int)(pointsEarned * lineTotals[i] / total) : 0;
                allocated += linePoints[i];
            }
            linePoints[^1] = pointsEarned - allocated;
        }

        for (var i = 0; i < lines.Count; i++)
        {
            var (product, qty) = lines[i];
            db.Sales.Add(new Sale
            {
                ReceiptNo = receiptNo,
                CustomerId = customer?.CustomerId,
                ProductId = product.ProductId,
                Quantity = qty,
                UnitPrice = product.Price,
                TotalAmount = product.Price * qty,
                Date = when,
                PaymentMethod = paymentMethod,
                Channel = channel,
                LoyaltyPointsEarned = customer is null ? 0 : linePoints[i]
            });

            product.Stock -= qty;
            var inv = product.Inventories.FirstOrDefault();
            if (inv is not null) inv.Quantity -= qty;

            db.StockMovements.Add(new StockMovement
            {
                ProductId = product.ProductId,
                Quantity = qty,
                Direction = "Out",
                Date = when,
                Reference = receiptNo
            });
        }

        if (customer is not null && pointsEarned > 0)
        {
            db.Loyalties.Add(new Loyalty
            {
                CustomerId = customer.CustomerId,
                PointsEarned = pointsEarned,
                PointsRedeemed = 0,
                Date = when,
                Note = $"Earned from {receiptNo}"
            });
            customer.LoyaltyPoints += pointsEarned;
            customer.Tier = LoyaltyRules.TierFor(customer.LoyaltyPoints);
        }

        db.SystemLogs.Add(Audit.Log(actorEmail,
            $"{channel} sale {receiptNo} completed — ₱{total:N0}" +
            (customer is null ? "" : $" · {customer.Name} +{pointsEarned} pts") +
            (logNote is null ? "" : $" · {logNote}"), "Sales"));

        await db.SaveChangesAsync();
        return (subtotal, total, pointsEarned);
    }
}
