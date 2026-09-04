namespace FashionFlow.Models;

public class SystemLog
{
    public int LogId { get; set; }
    public DateTime Time { get; set; }
    public string UserEmail { get; set; } = "";
    public string Action { get; set; } = "";
    // Sales | Inventory | Purchasing | Supplier | Reports | System | Auth
    public string Type { get; set; } = "";
}
