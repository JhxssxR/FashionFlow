namespace FashionFlow.Models;

public class Promotion
{
    public int PromotionId { get; set; }
    public string Code { get; set; } = "";
    public string Description { get; set; } = "";
    // Percent (value = % off) or Fixed (value = ₱ off) or Tier (loyalty-tier perk)
    public string DiscountType { get; set; } = "Percent";
    public decimal DiscountValue { get; set; }
    public string AppliesTo { get; set; } = "All"; // All | category name | Clearance
    // Minimum order subtotal for the code to apply (the "orders ₱2,000+" in
    // FF200's description). Null or zero = no minimum.
    public decimal? MinSpend { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public int Uses { get; set; }
    public bool IsActive { get; set; } = true;

    public string Status(DateTime today) =>
        !IsActive ? "Expired"
        : today < ValidFrom.ToDateTime(TimeOnly.MinValue) ? "Scheduled"
        : today > ValidTo.ToDateTime(TimeOnly.MinValue) ? "Expired"
        : "Active";
}
