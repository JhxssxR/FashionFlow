using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/promotions")]
public class PromotionsController(FashionFlowDbContext db) : ControllerBase
{
    private static object Row(Promotion p) => new
    {
        code = p.Code,
        p.Description,
        discountType = p.DiscountType,
        discountValue = p.DiscountValue,
        appliesTo = p.AppliesTo,
        validFrom = p.ValidFrom.ToString("yyyy-MM-dd"),
        validTo = p.ValidTo.ToString("yyyy-MM-dd"),
        p.Uses,
        status = p.Status(DateTime.Today)
    };

    [HttpGet]
    [Authorize(Roles = "Admin,SalesStaff,Accountant")]
    public async Task<IActionResult> List()
    {
        var rows = await db.Promotions.OrderByDescending(p => p.ValidFrom).ToListAsync();
        return Ok(rows.Select(Row));
    }

    // Public: the storefront offers bar and the customer's "My promotions".
    [HttpGet("active")]
    [AllowAnonymous]
    public async Task<IActionResult> Active()
    {
        var today = DateTime.Today;
        var rows = await db.Promotions
            .Where(p => p.IsActive && p.ValidFrom.ToDateTime(TimeOnly.MinValue) <= today
                                        && p.ValidTo.ToDateTime(TimeOnly.MinValue) >= today)
            .OrderBy(p => p.ValidTo)
            .ToListAsync();
        return Ok(rows.Select(Row));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> Create(SavePromotionRequest req)
    {
        var code = req.Code.Trim().ToUpperInvariant();
        if (await db.Promotions.AnyAsync(p => p.Code == code))
            return Conflict(new { message = $"Promo code {code} already exists." });

        var promo = new Promotion
        {
            Code = code,
            Description = req.Description.Trim(),
            DiscountType = req.DiscountType,
            DiscountValue = req.DiscountValue,
            AppliesTo = req.AppliesTo,
            ValidFrom = req.ValidFrom,
            ValidTo = req.ValidTo
        };
        db.Promotions.Add(promo);
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Promotion created: {promo.Code} — {promo.Description}", "Sales"));
        await db.SaveChangesAsync();
        return StatusCode(201, Row(promo));
    }

    [HttpPut("{code}")]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> Update(string code, SavePromotionRequest req)
    {
        var promo = await db.Promotions.FirstOrDefaultAsync(p => p.Code == code.ToUpperInvariant());
        if (promo is null) return NotFound(new { message = "Promotion not found." });

        promo.Description = req.Description.Trim();
        promo.DiscountType = req.DiscountType;
        promo.DiscountValue = req.DiscountValue;
        promo.AppliesTo = req.AppliesTo;
        promo.ValidFrom = req.ValidFrom;
        promo.ValidTo = req.ValidTo;
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Promotion updated: {promo.Code}", "Sales"));
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // POS-side validation without charging — the terminal calls this when a
    // code is typed into the cart to preview the discount.
    [HttpPost("validate")]
    [Authorize(Roles = "Admin,SalesStaff,Customer")]
    public async Task<IActionResult> Validate(ValidatePromoRequest req)
    {
        var promo = await db.Promotions.FirstOrDefaultAsync(p => p.Code == req.Code.Trim().ToUpperInvariant());
        if (promo is null)
            return NotFound(new { valid = false, discount = 0m, message = "Promo code does not exist." });

        var ineligible = PromoRules.CheckEligible(promo, DateTime.Now, req.CustomerTier);
        if (ineligible is not null)
            return Ok(new { valid = false, discount = 0m, message = ineligible });

        // Preview against the whole basket subtotal; per-line scoping is done
        // again precisely at charge time (SalesController).
        var categories = req.Categories ?? [];
        var applies = promo.AppliesTo == "All"
            || promo.AppliesTo.StartsWith("Tier:")
            || promo.AppliesTo == "Clearance"
            || categories.Any(c => string.Equals(c, promo.AppliesTo, StringComparison.OrdinalIgnoreCase));

        var discount = applies
            ? promo.DiscountType == "Percent"
                ? Math.Round(req.Subtotal * promo.DiscountValue / 100m, 2)
                : Math.Min(promo.DiscountValue, req.Subtotal)
            : 0m;

        return Ok(new
        {
            valid = discount > 0,
            discount,
            message = discount > 0 ? $"{promo.Description} applied (−₱{discount:N0})" : $"{promo.Code} does not apply to this basket."
        });
    }
}
