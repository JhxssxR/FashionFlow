namespace FashionFlow.Models;

// One in-app notification for one recipient (Users.UserId). Events fan out a
// row per affected account (e.g. every InventoryManager on a delivery), so
// each user tracks their own read state in the bell dropdown.
public class Notification
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    // Order | Purchasing | Inventory | Loyalty | Account | System
    public string Type { get; set; } = "System";
    // Optional hash route the bell opens when the item is clicked
    // ("dashboard/customer/orders", "dashboard/purchasing/tracking", …).
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
