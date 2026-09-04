using FashionFlow.Models;

namespace FashionFlow.Services;

// Promotion evaluation shared by the POS checkout (SalesController POST) and
// the /api/promotions/validate endpoint. AppliesTo semantics:
//   "All"         → every item
//   "Tier:Gold"   → all items, but only for that loyalty tier
//   "Clearance"   → items with a struck-through original price
//   anything else → items whose ERP category matches (e.g. "Bottoms")
public static class PromoRules
{
    public static string? CheckEligible(Promotion promo, DateTime now, string? customerTier)
    {
        if (!promo.IsActive) return "This promo code is no longer active.";
        if (now < promo.ValidFrom.ToDateTime(TimeOnly.MinValue)) return "This promo has not started yet.";
        if (now > promo.ValidTo.ToDateTime(TimeOnly.MinValue)) return "This promo code has expired.";
        if (promo.AppliesTo.StartsWith("Tier:") &&
            !string.Equals(customerTier, promo.AppliesTo[5..], StringComparison.OrdinalIgnoreCase))
            return $"This promo is exclusive to {promo.AppliesTo[5..]} members.";
        return null;
    }

    // lineSubtotals / lineCategories / clearance run parallel per cart line;
    // customerTier may be null for walk-ins. The discount is computed against
    // the subtotal of the lines the promo applies to.
    public static decimal ComputeDiscount(Promotion promo, decimal[] lineSubtotals, string[] lineCategories,
        bool[] clearance, string? customerTier)
    {
        var applicable = 0m;
        for (var i = 0; i < lineSubtotals.Length; i++)
        {
            var applies = promo.AppliesTo == "All"
                || (promo.AppliesTo.StartsWith("Tier:")
                    && string.Equals(customerTier, promo.AppliesTo[5..], StringComparison.OrdinalIgnoreCase))
                || (promo.AppliesTo == "Clearance" && clearance[i])
                || string.Equals(lineCategories[i], promo.AppliesTo, StringComparison.OrdinalIgnoreCase);
            if (applies) applicable += lineSubtotals[i];
        }
        if (applicable <= 0) return 0;

        return promo.DiscountType switch
        {
            "Percent" => Math.Round(applicable * promo.DiscountValue / 100m, 2),
            "Fixed" => Math.Min(promo.DiscountValue, applicable),
            _ => 0
        };
    }
}
