namespace FashionFlow.Models;

public class Loyalty
{
    public int LoyaltyId { get; set; }
    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public int PointsEarned { get; set; }
    public int PointsRedeemed { get; set; }
    public DateTime Date { get; set; }
    public string Note { get; set; } = "";
}
