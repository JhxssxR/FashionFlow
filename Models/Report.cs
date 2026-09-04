namespace FashionFlow.Models;

public class Report
{
    public int ReportId { get; set; }
    public string Title { get; set; } = "";
    // Sales | Inventory | Financial
    public string Type { get; set; } = "";
    public DateTime Date { get; set; }
    public string GeneratedBy { get; set; } = "";
}
