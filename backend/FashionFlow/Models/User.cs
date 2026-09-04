namespace FashionFlow.Models;

public class User
{
    public int UserId { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    // Canonical role used for RBAC: Admin, InventoryManager, PurchasingOfficer,
    // SalesStaff, Customer, Accountant, Supplier
    public string Role { get; set; } = "";
    // Frontend hash route: admin, inventory, purchasing, sales, customer, accountant, supplier
    public string DashboardKey { get; set; } = "";
    public string Status { get; set; } = "Active"; // Active | Invited
    public int? CustomerId { get; set; }
    public int? SupplierId { get; set; }
}
