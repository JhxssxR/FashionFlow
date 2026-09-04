namespace FashionFlow.Services;

public static class Roles
{
    public static readonly string[] All =
        ["Admin", "InventoryManager", "PurchasingOfficer", "SalesStaff", "Customer", "Accountant", "Supplier"];

    public static string DashboardKeyFor(string role) => role switch
    {
        "Admin" => "admin",
        "InventoryManager" => "inventory",
        "PurchasingOfficer" => "purchasing",
        "SalesStaff" => "sales",
        "Customer" => "customer",
        "Accountant" => "accountant",
        "Supplier" => "supplier",
        _ => ""
    };

    public static string RoleLabel(string role) => role switch
    {
        "Admin" => "System Administrator",
        "InventoryManager" => "Inventory Manager",
        "PurchasingOfficer" => "Purchasing Officer",
        "SalesStaff" => "Sales Staff",
        "Customer" => "Customer",
        "Accountant" => "Accountant",
        "Supplier" => "Supplier",
        _ => role
    };
}
