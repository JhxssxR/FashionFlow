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
    // Delivery address captured at self-registration (all optional —
    // checkout always allows editing). Used to prefill shipping.
    public string Address { get; set; } = "";
    public string Barangay { get; set; } = "";
    public string City { get; set; } = "";
    public string Province { get; set; } = "";
    public string ZipCode { get; set; } = "";
}
