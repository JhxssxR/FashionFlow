namespace FashionFlow.Services;

// Single source of truth for the loyalty ladder: tiers, progress and perks.
public static class LoyaltyRules
{
    public static string TierFor(int points) => points switch
    {
        >= 2000 => "Platinum",
        >= 1000 => "Gold",
        >= 500 => "Silver",
        _ => "Bronze"
    };

    public static (string NextTier, int PointsToNext) NextTierFor(int points) => points switch
    {
        >= 2000 => ("Platinum", 0),
        >= 1000 => ("Platinum", 2000 - points),
        >= 500 => ("Gold", 1000 - points),
        _ => ("Silver", 500 - points)
    };

    public static string[] PerksFor(string tier) => tier switch
    {
        "Platinum" => ["Free shipping always", "Early access to drops", "Birthday voucher", "Personal stylist", "Double points weekends"],
        "Gold" => ["Free shipping always", "Early access to drops", "Birthday voucher"],
        "Silver" => ["Free shipping over ₱3,000", "Early access to sales"],
        _ => ["Welcome voucher", "Earn 1 point per ₱100"]
    };

    // Earn rate: 1 point per ₱100 spent (AppSetting LoyaltyEarnRate).
    public static int PointsFor(decimal amountSpent) => (int)(amountSpent / 100);
}
