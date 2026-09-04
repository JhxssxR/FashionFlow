using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Data;

public class FashionFlowDbContext(DbContextOptions<FashionFlowDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Loyalty> Loyalties => Set<Loyalty>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<SystemLog> SystemLogs => Set<SystemLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Keys that don't follow the "<Type>Id" naming convention.
        mb.Entity<Employee>().HasKey(e => e.EmpId);
        mb.Entity<PurchaseOrder>().HasKey(p => p.PurchaseId);
        mb.Entity<SystemLog>().HasKey(l => l.LogId);
        mb.Entity<StockMovement>().HasKey(m => m.MovementId);

        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<Customer>().HasIndex(c => c.Email).IsUnique();
        mb.Entity<Sale>().HasIndex(s => s.ReceiptNo);
        mb.Entity<Sale>().HasIndex(s => s.Date);
        mb.Entity<PurchaseOrder>().HasIndex(p => p.PONumber).IsUnique();
        mb.Entity<Promotion>().HasIndex(p => p.Code).IsUnique();
        mb.Entity<AppSetting>().HasKey(a => a.Key);

        mb.Entity<Product>().Property(p => p.Price).HasPrecision(18, 2);
        mb.Entity<Product>().Property(p => p.OriginalPrice).HasPrecision(18, 2);
        mb.Entity<PurchaseOrder>().Property(p => p.UnitCost).HasPrecision(18, 2);
        mb.Entity<PurchaseOrder>().Property(p => p.Amount).HasPrecision(18, 2);
        mb.Entity<Sale>().Property(s => s.UnitPrice).HasPrecision(18, 2);
        mb.Entity<Sale>().Property(s => s.TotalAmount).HasPrecision(18, 2);
        mb.Entity<Promotion>().Property(p => p.DiscountValue).HasPrecision(18, 2);
        mb.Entity<Supplier>().Property(s => s.Rating).HasPrecision(3, 1);
    }
}
