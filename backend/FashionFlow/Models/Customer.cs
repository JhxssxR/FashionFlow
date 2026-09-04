namespace FashionFlow.Models;

public class Customer
{
    public int CustomerId { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public int LoyaltyPoints { get; set; }
    // Bronze | Silver | Gold | Platinum
    public string Tier { get; set; } = "Bronze";
    public DateOnly JoinedDate { get; set; }
}
