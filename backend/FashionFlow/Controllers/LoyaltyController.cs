using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/loyalty")]
[Authorize(Roles = "Customer,Admin,SalesStaff")]
public class LoyaltyController(FashionFlowDbContext db) : ControllerBase
{
    // The logged-in customer's rewards card: balance, tier progress, perks
    // and the full earn/redeem ledger.
    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Mine()
    {
        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        var customer = await db.Customers.FindAsync(customerId);
        if (customer is null) return NotFound(new { message = "Customer profile not found." });

        var ledger = await db.Loyalties
            .Where(l => l.CustomerId == customerId)
            .OrderByDescending(l => l.Date)
            .Select(l => new { date = l.Date, note = l.Note, earned = l.PointsEarned, redeemed = l.PointsRedeemed })
            .ToListAsync();

        var (nextTier, pointsToNext) = LoyaltyRules.NextTierFor(customer.LoyaltyPoints);
        return Ok(new
        {
            name = customer.Name,
            points = customer.LoyaltyPoints,
            tier = customer.Tier,
            nextTier,
            pointsToNext,
            perks = LoyaltyRules.PerksFor(customer.Tier),
            ledger
        });
    }

    // Redeem points for vouchers/credits at the counter or online.
    [HttpPost("redeem")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Redeem(RedeemPointsRequest req)
    {
        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        var customer = await db.Customers.FindAsync(customerId);
        if (customer is null) return NotFound(new { message = "Customer profile not found." });

        if (req.Points > customer.LoyaltyPoints)
            return Conflict(new { message = $"You only have {customer.LoyaltyPoints} points available." });

        customer.LoyaltyPoints -= req.Points;
        customer.Tier = LoyaltyRules.TierFor(customer.LoyaltyPoints);

        db.Loyalties.Add(new Loyalty
        {
            CustomerId = customerId.Value,
            PointsEarned = 0,
            PointsRedeemed = req.Points,
            Date = DateTime.Now,
            Note = string.IsNullOrWhiteSpace(req.Note) ? $"Redeemed {req.Points} points" : req.Note.Trim()
        });
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Loyalty redemption: {req.Points} points by {customer.Name}", "Sales"));
        await db.SaveChangesAsync();

        return Ok(new { ok = true, points = customer.LoyaltyPoints, tier = customer.Tier });
    }
}
