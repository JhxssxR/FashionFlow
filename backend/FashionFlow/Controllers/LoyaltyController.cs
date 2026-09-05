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

    // Redeemable rewards catalog — what loyalty points can buy. Costs are
    // calibrated to the 1 point / ₱100 earn rate, so a ₱3,000 order earns 30
    // points and the entry reward lands after a few orders.
    private static readonly (string Id, string Title, string Blurb, int Cost, string Type, decimal Value)[] Rewards =
    {
        ("voucher100", "₱100 OFF your next order", "Fixed ₱100 discount, one online order", 150, "Fixed", 100m),
        ("percent10", "10% OFF your next order", "10% off everything in one online order", 300, "Percent", 10m),
        ("voucher300", "₱300 OFF your next order", "Fixed ₱300 discount, one online order", 450, "Fixed", 300m),
        ("voucher800", "₱800 OFF your next order", "Fixed ₱800 discount, one online order", 1000, "Fixed", 800m)
    };

    [HttpGet("rewards")]
    public IActionResult ListRewards() => Ok(Rewards.Select(r => new { id = r.Id, title = r.Title, blurb = r.Blurb, cost = r.Cost }));

    // Redeem points: either a catalog reward (RewardId → issues a single-use
    // voucher code usable at online checkout) or legacy free-form points
    // (counter credit). Both write a ledger entry and recompute the tier.
    [HttpPost("redeem")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Redeem(RedeemPointsRequest req)
    {
        var customerId = User.CustomerId();
        if (customerId is null)
            return Unauthorized(new { message = "This account is not linked to a customer profile." });

        var customer = await db.Customers.FindAsync(customerId);
        if (customer is null) return NotFound(new { message = "Customer profile not found." });

        (string Title, int Cost, string Type, decimal Value)? reward = null;
        int points;
        string note;

        if (!string.IsNullOrWhiteSpace(req.RewardId))
        {
            var def = Rewards.FirstOrDefault(r => r.Id == req.RewardId.Trim());
            if (def.Id is null) return NotFound(new { message = "Unknown reward." });
            reward = (def.Title, def.Cost, def.Type, def.Value);
            points = def.Cost;
            note = $"Redeemed: {def.Title} — voucher {{CODE}}";
        }
        else
        {
            if (req.Points is null || req.Points < 1)
                return BadRequest(new { message = "Choose a reward or enter the points to redeem." });
            points = req.Points.Value;
            note = string.IsNullOrWhiteSpace(req.Note) ? $"Redeemed {points} points" : req.Note.Trim();
        }

        if (points > customer.LoyaltyPoints)
            return Conflict(new { message = $"You only have {customer.LoyaltyPoints} points available." });

        customer.LoyaltyPoints -= points;
        customer.Tier = LoyaltyRules.TierFor(customer.LoyaltyPoints);

        string? voucherCode = null;
        if (reward is not null)
        {
            voucherCode = await NewVoucherCodeAsync();
            db.Promotions.Add(new Promotion
            {
                Code = voucherCode,
                Description = $"Reward voucher — {reward.Value.Title} (for {customer.Name})",
                DiscountType = reward.Value.Type,
                DiscountValue = reward.Value.Value,
                AppliesTo = "All",
                ValidFrom = DateOnly.FromDateTime(DateTime.Today),
                ValidTo = DateOnly.FromDateTime(DateTime.Today.AddDays(30)),
                Uses = 0,
                IsActive = true
            });
            note = note.Replace("{CODE}", voucherCode);
        }

        db.Loyalties.Add(new Loyalty
        {
            CustomerId = customerId.Value,
            PointsEarned = 0,
            PointsRedeemed = points,
            Date = DateTime.Now,
            Note = note
        });
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Loyalty redemption: {points} points by {customer.Name}", "Sales"));
        await db.SaveChangesAsync();

        return Ok(new
        {
            ok = true,
            points = customer.LoyaltyPoints,
            tier = customer.Tier,
            code = voucherCode,
            title = reward?.Title,
            validTo = reward is not null ? DateOnly.FromDateTime(DateTime.Today.AddDays(30)).ToString("yyyy-MM-dd") : null
        });
    }

    // RWD-XXXXXX voucher codes — unguessable and collision-checked.
    private async Task<string> NewVoucherCodeAsync()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        while (true)
        {
            var code = "RWD-" + new string(Enumerable.Range(0, 6)
                .Select(_ => alphabet[Random.Shared.Next(alphabet.Length)]).ToArray());
            if (!await db.Promotions.AnyAsync(p => p.Code == code)) return code;
        }
    }
}
