using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Data;

// One-time seed on an empty database. The system is intentionally
// DATA-DRIVEN: only master data is seeded (accounts, supplier companies,
// product catalog, promo campaigns, system settings) — no demo sales,
// purchase orders, loyalty history, stock movements, logs or reports.
// Every dashboard starts empty and fills up from real user actions.
public static class DbSeed
{
    // Tier ladder: Bronze < 500, Silver < 1000, Gold < 2000, Platinum >= 2000.
    public static string TierFor(int points) => points switch
    {
        >= 2000 => "Platinum",
        >= 1000 => "Gold",
        >= 500 => "Silver",
        _ => "Bronze"
    };

    public static async Task<bool> SeedIfEmptyAsync(FashionFlowDbContext db)
    {
        if (await db.Users.AnyAsync()) return false;

        using var tx = await db.Database.BeginTransactionAsync();

        // ---------- Supplier companies (master data: purchasing orders these
        // suppliers and the Supplier Portal accounts are linked to them) ----------
        var suppliers = new List<Supplier>
        {
            new() { Name = "Denim Republic PH", Contact = "Marco Lim", Email = "supplier@fashionflow.com", Category = "Denim & Bottoms", Address = "12 Kamagong St., Makati City", Rating = 4.8m, OnTimeRate = 96 },
            new() { Name = "Manila Textile Hub", Contact = "Lorna Bautista", Email = "lorna@manilatextile.ph", Category = "Fabrics", Address = "88 Divisoria Market, Manila", Rating = 4.6m, OnTimeRate = 92 },
            new() { Name = "Cebu Garments Co.", Contact = "Paolo Escaño", Email = "paolo@cebugarments.com", Category = "Tops & Tees", Address = "5 Mandaue Industrial Park, Cebu", Rating = 4.4m, OnTimeRate = 88 },
            new() { Name = "Baguio Weaves", Contact = "Aileen Kim", Email = "aileen@baguioweaves.ph", Category = "Outerwear", Address = "3 Session Road, Baguio City", Rating = 4.9m, OnTimeRate = 98 },
            new() { Name = "Davao Apparel Supply", Contact = "Rico Dizon", Email = "rico@davaoapparel.com", Category = "Dresses", Address = "21 Quimpo Blvd., Davao City", Rating = 4.2m, OnTimeRate = 84 }
        };
        db.Suppliers.AddRange(suppliers);
        await db.SaveChangesAsync();

        // ---------- Accounts (the only seeded users; passwords from the
        // project documentation, BCrypt-hashed) ----------
        // Bea's customer account links to her CRM profile so checkout and
        // loyalty work out of the box — with a ZERO starting balance.
        var bea = new Customer
        {
            Name = "Bea Mendoza",
            Email = "customer@fashionflow.com",
            Tier = "Bronze",
            JoinedDate = DateOnly.FromDateTime(DateTime.Today)
        };
        db.Customers.Add(bea);
        await db.SaveChangesAsync();

        var users = new List<User>
        {
            new() { Name = "Jhasser Antukan", Email = "admin@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("@dm1n!@#", workFactor: 10), Role = "Admin", DashboardKey = "admin", Status = "Active" },
            new() { Name = "Mara Villanueva", Email = "inventman@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("inv3ntm4n!@#", workFactor: 10), Role = "InventoryManager", DashboardKey = "inventory", Status = "Active" },
            new() { Name = "Carlo Reyes", Email = "purchase@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("purch453!@#", workFactor: 10), Role = "PurchasingOfficer", DashboardKey = "purchasing", Status = "Active" },
            new() { Name = "Jasmine Cruz", Email = "sales@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("s4l3sPOS!@#", workFactor: 10), Role = "SalesStaff", DashboardKey = "sales", Status = "Active" },
            new() { Name = "Bea Mendoza", Email = "customer@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("cust0m3r!@#", workFactor: 10), Role = "Customer", DashboardKey = "customer", Status = "Active", CustomerId = bea.CustomerId },
            new() { Name = "Pia Santos", Email = "accountan@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("acc0unt4n!@#", workFactor: 10), Role = "Accountant", DashboardKey = "accountant", Status = "Active" },
            new() { Name = "Marco Lim", Email = "supplier@fashionflow.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("suppl13r!@#", workFactor: 10), Role = "Supplier", DashboardKey = "supplier", Status = "Active", SupplierId = suppliers[0].SupplierId },
            new() { Name = "Lorna Bautista", Email = "lorna@manilatextile.ph", PasswordHash = BCrypt.Net.BCrypt.HashPassword("inv1t3d!@#", workFactor: 10), Role = "Supplier", DashboardKey = "supplier", Status = "Invited", SupplierId = suppliers[1].SupplierId }
        };
        db.Users.AddRange(users);
        await db.SaveChangesAsync();

        // ---------- Employee records for the staff accounts ----------
        string[][] staff =
        {
            new[] { "Alex", "Tan", "admin@fashionflow.com" },
            new[] { "Mara", "Villanueva", "inventman@fashionflow.com" },
            new[] { "Carlo", "Reyes", "purchase@fashionflow.com" },
            new[] { "Jasmine", "Cruz", "sales@fashionflow.com" },
            new[] { "Pia", "Santos", "accountan@fashionflow.com" }
        };
        for (var i = 0; i < staff.Length; i++)
        {
            var u = users.First(x => x.Email == staff[i][2]);
            db.Employees.Add(new Employee
            {
                UserId = u.UserId,
                EmpNumber = $"FF-EMP-{i + 1:D3}",
                FirstName = staff[i][0],
                LastName = staff[i][1],
                MiddleName = ""
            });
        }
        await db.SaveChangesAsync();

        // ---------- Products (the storefront catalog, with opening stock) ----------
        (string name, string variant, decimal price, decimal? orig, int stock, string cat, string storeCat, bool isNew, string img)[] productDefs =
        {
            ("Linen Blazer", "Medium / Brown", 7480, null, 34, "Outerwear", "Outerwear", true, "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop"),
            ("Midi Wrap Dress", "Small / Blue", 9220, 10960, 12, "Dresses", "Women", true, "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop"),
            ("Wide Leg Trousers", "Medium / Multi", 5160, 6900, 6, "Bottoms", "Women", true, "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?q=80&w=600&auto=format&fit=crop"),
            ("Faux Leather Jacket", "Large / Brown", 11540, null, 21, "Outerwear", "Outerwear", true, "https://images.unsplash.com/photo-1559551409-dadc959f76b8?q=80&w=600&auto=format&fit=crop"),
            ("Silk Slip Dress", "Small / Floral", 8640, 10960, 27, "Dresses", "Women", true, "https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?q=80&w=600&auto=format&fit=crop"),
            ("Floral Wrap Maxi Dress", "Medium / Ivory", 9480, null, 4, "Dresses", "Women", true, "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop"),
            ("Tulle Midi Dress", "Small / Blush", 10980, null, 9, "Dresses", "Women", true, "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=600&auto=format&fit=crop"),
            ("Chambray Shirt", "Large / Indigo", 4980, 6480, 42, "Shirts", "Men", true, "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop"),
            ("Essential Crew Tee", "Medium / White", 2490, null, 86, "Tops", "Men", false, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop"),
            ("Straight Denim", "32 / Indigo", 5980, null, 18, "Bottoms", "Men", false, "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop"),
            ("Sherpa Denim Jacket", "Medium / Indigo", 10480, 12980, 3, "Outerwear", "Outerwear", false, "https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=600&auto=format&fit=crop"),
            ("Quilted Bomber Jacket", "Large / Black", 9980, null, 15, "Outerwear", "Outerwear", false, "https://images.unsplash.com/photo-1548126032-079a0fb0099d?q=80&w=600&auto=format&fit=crop")
        };
        var products = productDefs.Select(p => new Product
        {
            Name = p.name, Variant = p.variant, Price = p.price, OriginalPrice = p.orig,
            Stock = p.stock, Category = p.cat, StorefrontCategory = p.storeCat,
            ImageUrl = p.img, IsNew = p.isNew, IsActive = true
        }).ToList();
        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        // ---------- Inventory (one warehouse row per product) ----------
        db.Inventories.AddRange(products.Select(p => new Inventory
        {
            ProductId = p.ProductId,
            Quantity = p.Stock,
            Warehouse = "Main Warehouse — Quezon City"
        }));
        await db.SaveChangesAsync();

        // ---------- Promotions (fresh campaigns — zero recorded uses) ----------
        db.Promotions.AddRange(
            new Promotion { Code = "SCHOOL15", Description = "15% off all bottoms", DiscountType = "Percent", DiscountValue = 15, AppliesTo = "Bottoms", ValidFrom = new DateOnly(2026, 8, 1), ValidTo = new DateOnly(2026, 9, 30), Uses = 0 },
            new Promotion { Code = "FF200", Description = "₱200 off orders ₱2,000+", DiscountType = "Fixed", DiscountValue = 200, AppliesTo = "All", MinSpend = 2000m, ValidFrom = new DateOnly(2026, 8, 15), ValidTo = new DateOnly(2026, 12, 31), Uses = 0 },
            new Promotion { Code = "CLEAR30", Description = "30% off clearance", DiscountType = "Percent", DiscountValue = 30, AppliesTo = "Clearance", ValidFrom = new DateOnly(2026, 9, 1), ValidTo = new DateOnly(2026, 10, 31), Uses = 0 },
            new Promotion { Code = "BER2026", Description = "₱500 off for loyalty Gold tier", DiscountType = "Fixed", DiscountValue = 500, AppliesTo = "Tier:Gold", ValidFrom = new DateOnly(2026, 9, 15), ValidTo = new DateOnly(2026, 12, 31), Uses = 0 }
        );

        // ---------- System settings ----------
        db.AppSettings.AddRange(
            new AppSetting { Key = "StoreName", Value = "FashionFlow" },
            new AppSetting { Key = "Currency", Value = "Philippine Peso (₱) — PHP" },
            new AppSetting { Key = "LoyaltyEarnRate", Value = "1 point per ₱100 spent" },
            new AppSetting { Key = "LowStockThreshold", Value = "12" },
            new AppSetting { Key = "VatRate", Value = "12% (inclusive)" }
        );

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    // The storefront opens a colour + size picker when a shopper chooses a
    // style (the product photo follows the colour), so every style needs one
    // row per size/colour combo — each with its own stock and image. The
    // original seed shipped one variant per style; this backfill completes
    // the matrix on both fresh and existing databases. Idempotent: existing
    // variants are skipped, removed styles are left alone.
    public static async Task BackfillVariantSiblingsAsync(FashionFlowDbContext db)
    {
        // color/image null → the style's original colour (inherits its image).
        // image non-null → an additional colour, one row per listed size.
        var defs = new (string name, string size, string? color, int stock, string? image)[]
        {
            ("Linen Blazer", "Small", null, 22, null), ("Linen Blazer", "Large", null, 17, null),
            ("Linen Blazer", "Small", "Blue", 12, "/assets/colors/linen-blazer-blue.jpg"),
            ("Linen Blazer", "Medium", "Blue", 18, "/assets/colors/linen-blazer-blue.jpg"),
            ("Linen Blazer", "Large", "Blue", 9, "/assets/colors/linen-blazer-blue.jpg"),
            ("Midi Wrap Dress", "Medium", null, 8, null), ("Midi Wrap Dress", "Large", null, 0, null),
            ("Midi Wrap Dress", "Small", "Black", 7, "/assets/colors/midi-wrap-black.jpg"),
            ("Midi Wrap Dress", "Medium", "Black", 0, "/assets/colors/midi-wrap-black.jpg"),
            ("Midi Wrap Dress", "Large", "Black", 5, "/assets/colors/midi-wrap-black.jpg"),
            ("Wide Leg Trousers", "Small", null, 9, null), ("Wide Leg Trousers", "Large", null, 0, null),
            ("Wide Leg Trousers", "Small", "Beige", 6, "/assets/colors/trousers-beige.jpg"),
            ("Wide Leg Trousers", "Medium", "Beige", 11, "/assets/colors/trousers-beige.jpg"),
            ("Wide Leg Trousers", "Large", "Beige", 4, "/assets/colors/trousers-beige.jpg"),
            ("Faux Leather Jacket", "Medium", null, 14, null), ("Faux Leather Jacket", "Small", null, 7, null),
            ("Faux Leather Jacket", "Small", "Black", 10, "/assets/colors/leather-black.jpg"),
            ("Faux Leather Jacket", "Medium", "Black", 13, "/assets/colors/leather-black.jpg"),
            ("Faux Leather Jacket", "Large", "Black", 6, "/assets/colors/leather-black.jpg"),
            ("Silk Slip Dress", "Medium", null, 19, null), ("Silk Slip Dress", "Large", null, 11, null),
            ("Silk Slip Dress", "Small", "Emerald", 8, "/assets/colors/slip-emerald.jpg"),
            ("Silk Slip Dress", "Medium", "Emerald", 12, "/assets/colors/slip-emerald.jpg"),
            ("Silk Slip Dress", "Large", "Emerald", 0, "/assets/colors/slip-emerald.jpg"),
            ("Floral Wrap Maxi Dress", "Small", null, 3, null), ("Floral Wrap Maxi Dress", "Large", null, 6, null),
            ("Floral Wrap Maxi Dress", "Small", "Red", 5, "/assets/colors/maxi-red.jpg"),
            ("Floral Wrap Maxi Dress", "Medium", "Red", 7, "/assets/colors/maxi-red.jpg"),
            ("Floral Wrap Maxi Dress", "Large", "Red", 3, "/assets/colors/maxi-red.jpg"),
            ("Tulle Midi Dress", "Medium", null, 4, null), ("Tulle Midi Dress", "Large", null, 2, null),
            ("Tulle Midi Dress", "Small", "Lavender", 4, "/assets/colors/tulle-lavender.jpg"),
            ("Tulle Midi Dress", "Medium", "Lavender", 6, "/assets/colors/tulle-lavender.jpg"),
            ("Tulle Midi Dress", "Large", "Lavender", 2, "/assets/colors/tulle-lavender.jpg"),
            ("Chambray Shirt", "Medium", null, 25, null), ("Chambray Shirt", "Small", null, 18, null),
            ("Chambray Shirt", "Small", "White", 15, "/assets/colors/chambray-white.jpg"),
            ("Chambray Shirt", "Medium", "White", 22, "/assets/colors/chambray-white.jpg"),
            ("Chambray Shirt", "Large", "White", 14, "/assets/colors/chambray-white.jpg"),
            ("Essential Crew Tee", "Small", null, 40, null), ("Essential Crew Tee", "Large", null, 31, null),
            ("Essential Crew Tee", "Small", "Black", 30, "/assets/colors/tee-black.jpg"),
            ("Essential Crew Tee", "Medium", "Black", 44, "/assets/colors/tee-black.jpg"),
            ("Essential Crew Tee", "Large", "Black", 27, "/assets/colors/tee-black.jpg"),
            ("Straight Denim", "30", null, 6, null), ("Straight Denim", "34", null, 9, null),
            ("Straight Denim", "30", "Black", 7, "/assets/colors/denim-black.jpg"),
            ("Straight Denim", "32", "Black", 12, "/assets/colors/denim-black.jpg"),
            ("Straight Denim", "34", "Black", 8, "/assets/colors/denim-black.jpg"),
            ("Sherpa Denim Jacket", "Small", null, 2, null), ("Sherpa Denim Jacket", "Large", null, 0, null),
            ("Sherpa Denim Jacket", "Small", "Grey", 3, "/assets/colors/sherpa-grey.jpg"),
            ("Sherpa Denim Jacket", "Medium", "Grey", 5, "/assets/colors/sherpa-grey.jpg"),
            ("Sherpa Denim Jacket", "Large", "Grey", 0, "/assets/colors/sherpa-grey.jpg"),
            ("Quilted Bomber Jacket", "Medium", null, 10, null), ("Quilted Bomber Jacket", "Small", null, 8, null),
            ("Quilted Bomber Jacket", "Small", "Olive", 9, "/assets/colors/bomber-olive.jpg"),
            ("Quilted Bomber Jacket", "Medium", "Olive", 12, "/assets/colors/bomber-olive.jpg"),
            ("Quilted Bomber Jacket", "Large", "Olive", 7, "/assets/colors/bomber-olive.jpg")
        };

        foreach (var byStyle in defs.GroupBy(d => d.name))
        {
            var baseRow = await db.Products.OrderBy(p => p.ProductId).FirstOrDefaultAsync(p => p.Name == byStyle.Key);
            if (baseRow is null) continue; // style removed from the catalog — nothing to extend

            // "Medium / Brown" → the original colour every base-size row shares.
            var sep = baseRow.Variant.IndexOf(" / ");
            var baseColor = sep >= 0 ? baseRow.Variant[(sep + 3)..] : "";

            var existing = await db.Products.Where(p => p.Name == byStyle.Key).Select(p => p.Variant).ToListAsync();

            foreach (var d in byStyle)
            {
                var color = d.color ?? baseColor;
                var variant = color == "" ? d.size : $"{d.size} / {color}";
                if (existing.Contains(variant)) continue;

                var sibling = new Product
                {
                    Name = baseRow.Name,
                    Variant = variant,
                    Price = baseRow.Price,
                    OriginalPrice = baseRow.OriginalPrice,
                    Stock = d.stock,
                    Category = baseRow.Category,
                    StorefrontCategory = baseRow.StorefrontCategory,
                    ImageUrl = d.image ?? baseRow.ImageUrl,
                    IsNew = baseRow.IsNew,
                    IsActive = true
                };
                db.Products.Add(sibling);
                db.Inventories.Add(new Inventory
                {
                    Product = sibling,
                    Quantity = d.stock,
                    Warehouse = "Main Warehouse — Quezon City"
                });
            }
        }

        // Rows created before a colour's photo changed (e.g. the earlier
        // different-model Unsplash images) are realigned with the def.
        foreach (var d in defs.Where(d => d.image != null))
        {
            var variant = $"{d.size} / {d.color}";
            var row = await db.Products.FirstOrDefaultAsync(p => p.Name == d.name && p.Variant == variant);
            if (row is not null && row.ImageUrl != d.image)
                row.ImageUrl = d.image!;
        }

        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesAsync();
    }

    // Ensures non-delivered Cash on Delivery orders do not count towards sales/revenue
    // until they are officially marked Delivered by staff/inventory manager.
    public static async Task CleanupPendingCodOrdersAsync(FashionFlowDbContext db)
    {
        var nonDeliveredCod = await db.Orders
            .Where(o => (o.PaymentMethod == "Cash on Delivery" || o.PaymentMethod == "COD") && o.Status != "Delivered")
            .ToListAsync();

        foreach (var o in nonDeliveredCod)
        {
            if (o.Status == "Paid")
            {
                o.Status = "Pending";
                o.PaidAt = null;
            }
        }

        var nonDeliveredNumbers = nonDeliveredCod.Select(o => o.OrderNumber).ToList();
        var orphanSales = await db.Sales.Where(s => nonDeliveredNumbers.Contains(s.ReceiptNo)).ToListAsync();
        if (orphanSales.Count > 0)
        {
            db.Sales.RemoveRange(orphanSales);
        }

        if (db.ChangeTracker.HasChanges())
        {
            await db.SaveChangesAsync();
        }
    }

    // Ensures every onboarded supplier has a linked active user account to log into the Supplier Portal.
    public static async Task EnsureSupplierAccountsAsync(FashionFlowDbContext db)
    {
        var suppliers = await db.Suppliers.ToListAsync();
        var existingUsers = await db.Users.Where(u => u.Role == "Supplier").ToListAsync();

        foreach (var s in suppliers)
        {
            var hasAccount = existingUsers.Any(u => u.SupplierId == s.SupplierId || string.Equals(u.Email, s.Email, StringComparison.OrdinalIgnoreCase));
            if (!hasAccount)
            {
                db.Users.Add(new User
                {
                    Name = s.Contact,
                    Email = s.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("suppl13r!@#", workFactor: 10),
                    Role = "Supplier",
                    DashboardKey = "supplier",
                    Status = "Active",
                    SupplierId = s.SupplierId
                });
            }
        }

        if (db.ChangeTracker.HasChanges())
        {
            await db.SaveChangesAsync();
        }
    }

    // Backfill: if a PO was created before the supplier's User account existed,
    // the notification was never pushed. This creates the missing notifications
    // for any Pending POs that have no matching notification row.
    public static async Task BackfillSupplierNotificationsAsync(FashionFlowDbContext db)
    {
        var pendingPos = await db.PurchaseOrders
            .Include(p => p.Product)
            .Include(p => p.Supplier)
            .Where(p => p.Status == "Pending")
            .ToListAsync();

        foreach (var po in pendingPos)
        {
            var supplierUser = await db.Users.FirstOrDefaultAsync(u => u.SupplierId == po.SupplierId);
            if (supplierUser is null) continue;

            // Check if a notification already exists for this PO + user.
            var exists = await db.Notifications.AnyAsync(n =>
                n.UserId == supplierUser.UserId &&
                n.Title.Contains(po.PONumber));
            if (exists) continue;

            db.Notifications.Add(new Notification
            {
                UserId = supplierUser.UserId,
                Title = $"New purchase order {po.PONumber}",
                Body = $"{po.Product!.Name} ×{po.Quantity} — ₱{po.Amount:N0}. Please review and confirm.",
                Type = "Purchasing",
                Link = "dashboard/supplier"
            });
        }

        if (db.ChangeTracker.HasChanges())
        {
            await db.SaveChangesAsync();
        }
    }
}
