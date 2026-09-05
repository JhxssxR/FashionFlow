using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Data;

// One-time seed on an empty database. Everything here was migrated from the
// prototype's mock data (frontend/src/data/dashboardData.js) so the demo
// story — catalog, suppliers, POs, 30 days of sales, loyalty ledger — is
// preserved, now backed by SQL Server.
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

        var rng = new Random(20260904); // deterministic demo data
        var today = DateTime.Today;

        using var tx = await db.Database.BeginTransactionAsync();

        // ---------- Users (passwords from the project documentation, BCrypt-hashed) ----------
        var users = new List<User>();
        void AddUser(string name, string email, string password, string role, string dash,
                     string status = "Active", int? customerId = null, int? supplierId = null)
        {
            users.Add(new User
            {
                Name = name,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 10),
                Role = role,
                DashboardKey = dash,
                Status = status,
                CustomerId = customerId,
                SupplierId = supplierId
            });
        }

        // Suppliers first so user links can reference them.
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

        // Customers next (Bea's user account links to her CRM record).
        var customers = new List<Customer>
        {
            new() { Name = "Kat Lorenzo", Email = "kat.lorenzo@gmail.com", Tier = "Bronze", JoinedDate = new DateOnly(2025, 11, 3) },
            new() { Name = "Bea Mendoza", Email = "customer@fashionflow.com", Tier = "Bronze", JoinedDate = new DateOnly(2026, 3, 14) },
            new() { Name = "Rina Dela Cruz", Email = "rina.dc@outlook.com", Tier = "Bronze", JoinedDate = new DateOnly(2025, 12, 20) },
            new() { Name = "Jun Manalo", Email = "junmanalo@yahoo.com", Tier = "Bronze", JoinedDate = new DateOnly(2026, 1, 9) },
            new() { Name = "Sofy Andrade", Email = "sofy.andrade@gmail.com", Tier = "Bronze", JoinedDate = new DateOnly(2026, 4, 22) },
            new() { Name = "Miko Tan", Email = "miko.tan@gmail.com", Tier = "Bronze", JoinedDate = new DateOnly(2026, 5, 30) }
        };
        db.Customers.AddRange(customers);
        await db.SaveChangesAsync();

        AddUser("Alex Tan", "admin@fashionflow.com", "@dm1n!@#", "Admin", "admin");
        AddUser("Mara Villanueva", "inventman@fashionflow.com", "inv3ntm4n!@#", "InventoryManager", "inventory");
        AddUser("Carlo Reyes", "purchase@fashionflow.com", "purch453!@#", "PurchasingOfficer", "purchasing");
        AddUser("Jasmine Cruz", "sales@fashionflow.com", "s4l3sPOS!@#", "SalesStaff", "sales");
        AddUser("Bea Mendoza", "customer@fashionflow.com", "cust0m3r!@#", "Customer", "customer", customerId: customers[1].CustomerId);
        AddUser("Pia Santos", "accountan@fashionflow.com", "acc0unt4n!@#", "Accountant", "accountant");
        AddUser("Marco Lim", "supplier@fashionflow.com", "suppl13r!@#", "Supplier", "supplier", supplierId: suppliers[0].SupplierId);
        AddUser("Lorna Bautista", "lorna@manilatextile.ph", "inv1t3d!@#", "Supplier", "supplier", status: "Invited", supplierId: suppliers[1].SupplierId);
        db.Users.AddRange(users);
        await db.SaveChangesAsync();

        // ---------- Employees ----------
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

        // ---------- Products (mirrors the storefront catalog) ----------
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

        // ---------- Promotions (re-dated so they are live for the demo) ----------
        db.Promotions.AddRange(
            new Promotion { Code = "SCHOOL15", Description = "15% off all bottoms", DiscountType = "Percent", DiscountValue = 15, AppliesTo = "Bottoms", ValidFrom = new DateOnly(2026, 8, 1), ValidTo = new DateOnly(2026, 9, 30), Uses = 142 },
            new Promotion { Code = "FF200", Description = "₱200 off orders ₱2,000+", DiscountType = "Fixed", DiscountValue = 200, AppliesTo = "All", ValidFrom = new DateOnly(2026, 8, 15), ValidTo = new DateOnly(2026, 9, 15), Uses = 318 },
            new Promotion { Code = "CLEAR30", Description = "30% off clearance", DiscountType = "Percent", DiscountValue = 30, AppliesTo = "Clearance", ValidFrom = new DateOnly(2026, 9, 1), ValidTo = new DateOnly(2026, 10, 31), Uses = 96 },
            new Promotion { Code = "BER2026", Description = "₱500 off for loyalty Gold tier", DiscountType = "Fixed", DiscountValue = 500, AppliesTo = "Tier:Gold", ValidFrom = new DateOnly(2026, 9, 15), ValidTo = new DateOnly(2026, 12, 31), Uses = 41 }
        );
        await db.SaveChangesAsync();

        // ---------- Purchase orders ----------
        var poDefs = new (string po, int sup, int prod, int qty, decimal unit, string status, DateOnly issued, DateOnly? eta, DateOnly? delivered)[]
        {
            ("PO-2026-0188", 0, 10, 40, 3700m, "Pending", new DateOnly(2026, 9, 3), new DateOnly(2026, 9, 10), null),
            ("PO-2026-0187", 3, 0, 25, 3860m, "In Transit", new DateOnly(2026, 9, 2), new DateOnly(2026, 9, 6), null),
            ("PO-2026-0186", 2, 8, 120, 720m, "Delivered", new DateOnly(2026, 8, 30), new DateOnly(2026, 9, 2), new DateOnly(2026, 9, 2)),
            ("PO-2026-0185", 1, 4, 18, 6738.89m, "Delivered", new DateOnly(2026, 8, 28), new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 1)),
            ("PO-2026-0184", 4, 6, 30, 3480m, "Pending", new DateOnly(2026, 8, 27), new DateOnly(2026, 9, 12), null),
            ("PO-2026-0183", 0, 9, 60, 2310m, "Cancelled", new DateOnly(2026, 8, 25), null, null),
            ("PO-2026-0179", 0, 9, 45, 2310m, "Delivered", new DateOnly(2026, 8, 18), new DateOnly(2026, 8, 21), new DateOnly(2026, 8, 21)),
            ("PO-2026-0171", 0, 10, 25, 3700m, "Delivered", new DateOnly(2026, 8, 8), new DateOnly(2026, 8, 12), new DateOnly(2026, 8, 12)),
            ("PO-2026-0164", 0, 9, 30, 2310m, "Delivered", new DateOnly(2026, 7, 30), new DateOnly(2026, 8, 3), new DateOnly(2026, 8, 3))
        };
        db.PurchaseOrders.AddRange(poDefs.Select(p => new PurchaseOrder
        {
            PONumber = p.po, SupplierId = suppliers[p.sup].SupplierId, ProductId = products[p.prod].ProductId,
            Quantity = p.qty, UnitCost = p.unit, Amount = p.qty * p.unit, Status = p.status,
            IssuedDate = p.issued, Eta = p.eta, DeliveredDate = p.delivered
        }));
        await db.SaveChangesAsync();

        // ---------- Loyalty opening balances + redemptions ----------
        var openings = new[] { 2400, 780, 500, 300, 150, 100 };
        for (var i = 0; i < customers.Count; i++)
        {
            db.Loyalties.Add(new Loyalty
            {
                CustomerId = customers[i].CustomerId,
                PointsEarned = openings[i],
                PointsRedeemed = 0,
                Date = new DateTime(2026, 1, 15, 12, 0, 0),
                Note = "Points from earlier purchases"
            });
        }
        db.Loyalties.Add(new Loyalty { CustomerId = customers[0].CustomerId, PointsEarned = 0, PointsRedeemed = 500, Date = new DateTime(2026, 8, 20, 15, 30, 0), Note = "Redeemed ₱500 voucher" });
        db.Loyalties.Add(new Loyalty { CustomerId = customers[1].CustomerId, PointsEarned = 0, PointsRedeemed = 200, Date = new DateTime(2026, 8, 28, 11, 10, 0), Note = "Redeemed ₱200 shipping credit" });
        await db.SaveChangesAsync();

        // ---------- 30 days of sales history ----------
        // Bea's recorded online orders (dates/items from the prototype).
        var onlineOrders = new (string rcpt, DateOnly date, int cust, (int prod, int qty)[] items)[]
        {
            ("FF-10241", new DateOnly(2026, 9, 3), 1, new[] { (0, 1), (2, 1), (8, 1) }),
            ("FF-10198", new DateOnly(2026, 8, 24), 1, new[] { (4, 1) }),
            ("FF-10155", new DateOnly(2026, 8, 12), 1, new[] { (1, 1), (8, 2) }),
            ("FF-10093", new DateOnly(2026, 7, 29), 1, new[] { (3, 1) }),
            ("FF-10041", new DateOnly(2026, 7, 8), 1, new[] { (7, 1) })
        };
        foreach (var o in onlineOrders) AddSale(db, o.rcpt, o.date.ToDateTime(TimeOnly.MinValue), customers[o.cust], o.items, "Card", "Online", rng);

        // Deterministic walk-in + member spread over the previous 29 days
        // (36 transactions, so today's receipts continue at POS-1037+).
        string[] payments = { "Cash", "GCash", "Card", "Maya", "Cash", "GCash" };
        for (var i = 0; i < 36; i++)
        {
            var dayBack = 29 - (i * 29 / 36);
            var date = today.AddDays(-dayBack);
            var itemCount = rng.Next(1, 5);
            var items = new (int, int)[itemCount];
            for (var j = 0; j < itemCount; j++) items[j] = (rng.Next(0, products.Count), rng.Next(1, 3));
            var cust = rng.Next(0, 10) < 4 ? customers[rng.Next(0, customers.Count)] : null;
            var time = new DateTime(date.Year, date.Month, date.Day, rng.Next(10, 20), rng.Next(0, 60), 0);
            AddSale(db, null, date, cust, items, payments[rng.Next(payments.Length)], "POS", rng, time);
        }

        // Today's six POS transactions (same baskets the prototype showed).
        ((int prod, int qty)[] items, int custIdx, string payment, string time)[] todays =
        {
            (new[] { (11, 1), (4, 1), (2, 1), (8, 1), (7, 1) }, 0, "Card", "17:12"),   // Kat ₱31,250
            (new[] { (9, 1), (8, 1) }, 3, "GCash", "17:47"),                            // Jun ₱8,470
            (new[] { (0, 2) }, -1, "Card", "18:31"),                                    // Walk-in ₱14,960
            (new[] { (0, 2), (7, 1), (8, 1) }, 2, "Maya", "18:58"),                     // Rina ₱22,430
            (new[] { (2, 1) }, -1, "Cash", "19:15"),                                    // Walk-in ₱5,160
            (new[] { (11, 1), (8, 1) }, 1, "GCash", "19:42")                            // Bea ₱12,470
        };
        foreach (var t in todays)
        {
            var cust = t.custIdx >= 0 ? customers[t.custIdx] : null;
            var parts = t.time.Split(':');
            var time = today.AddHours(int.Parse(parts[0])).AddMinutes(int.Parse(parts[1]));
            AddSale(db, null, today, cust, t.items, t.payment, "POS", rng, time);
        }

        // ---------- Finalise loyalty points + tiers ----------
        foreach (var c in customers)
        {
            var earned = await db.Loyalties.Where(l => l.CustomerId == c.CustomerId).SumAsync(l => l.PointsEarned);
            var redeemed = await db.Loyalties.Where(l => l.CustomerId == c.CustomerId).SumAsync(l => l.PointsRedeemed);
            c.LoyaltyPoints = earned - redeemed;
            c.Tier = TierFor(c.LoyaltyPoints);
        }
        await db.SaveChangesAsync();

        // ---------- Stock movements (last 14 days) ----------
        var windowStart = today.AddDays(-13);
        var recentSales = await db.Sales.Where(s => s.Date >= windowStart).Include(s => s.Product).ToListAsync();
        foreach (var s in recentSales)
            db.StockMovements.Add(new StockMovement { ProductId = s.ProductId, Quantity = s.Quantity, Direction = "Out", Date = s.Date, Reference = s.ReceiptNo });

        // Receiving: PO deliveries in the window + periodic replenishment receipts.
        var delivered = await db.PurchaseOrders.Where(p => p.DeliveredDate >= DateOnly.FromDateTime(windowStart)).ToListAsync();
        foreach (var po in delivered)
            db.StockMovements.Add(new StockMovement { ProductId = po.ProductId, Quantity = po.Quantity, Direction = "In", Date = po.DeliveredDate!.Value.ToDateTime(TimeOnly.MinValue).AddHours(9), Reference = po.PONumber });
        for (var d = 0; d < 14; d++)
        {
            if (d % 3 != 1) continue;
            var date = windowStart.AddDays(d);
            var p = products[rng.Next(0, products.Count)];
            db.StockMovements.Add(new StockMovement
            {
                ProductId = p.ProductId,
                Quantity = 40 + rng.Next(0, 90),
                Direction = "In",
                Date = date.AddHours(9),
                Reference = $"RCV-2026-{300 + d:D3}"
            });
        }
        await db.SaveChangesAsync();

        // ---------- System logs ----------
        var now = DateTime.Now;
        db.SystemLogs.AddRange(
            new SystemLog { Time = now.AddHours(-3), UserEmail = "sales@fashionflow.com", Action = "POS sale POS-1042 completed", Type = "Sales" },
            new SystemLog { Time = now.AddHours(-4), UserEmail = "sales@fashionflow.com", Action = "POS sale POS-1040 completed", Type = "Sales" },
            new SystemLog { Time = now.AddHours(-6), UserEmail = "inventman@fashionflow.com", Action = "Stock adjustment: Floral Wrap Maxi Dress set to 4 units", Type = "Inventory" },
            new SystemLog { Time = now.AddHours(-8), UserEmail = "purchase@fashionflow.com", Action = "PO-2026-0188 created for Denim Republic PH", Type = "Purchasing" },
            new SystemLog { Time = now.AddHours(-10), UserEmail = "supplier@fashionflow.com", Action = "Delivery status updated: PO-2026-0187 → In Transit", Type = "Supplier" },
            new SystemLog { Time = now.AddHours(-13), UserEmail = "accountan@fashionflow.com", Action = "August VAT report generated", Type = "Reports" },
            new SystemLog { Time = now.AddDays(-1).AddHours(-4), UserEmail = "admin@fashionflow.com", Action = "User account invited: lorna@manilatextile.ph", Type = "System" },
            new SystemLog { Time = now.AddDays(-1).AddHours(-9), UserEmail = "admin@fashionflow.com", Action = "System setting changed: loyalty earn rate → 1 pt / ₱100", Type = "System" }
        );

        // ---------- Reports archive + system settings ----------
        db.Reports.AddRange(
            new Report { Title = "August 2026 Sales Summary", Type = "Sales", Date = new DateTime(2026, 9, 1, 8, 30, 0), GeneratedBy = "system" },
            new Report { Title = "August 2026 VAT Report", Type = "Financial", Date = new DateTime(2026, 9, 1, 13, 15, 0), GeneratedBy = "accountan@fashionflow.com" },
            new Report { Title = "August 2026 Inventory Valuation", Type = "Inventory", Date = new DateTime(2026, 9, 2, 9, 0, 0), GeneratedBy = "system" }
        );
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

    // Creates one sale transaction: lines share a receipt number and the
    // loyalty award (1 pt per ₱100 of the transaction total) is stamped on
    // the lines proportionally so they sum to the ledger entry.
    private static void AddSale(FashionFlowDbContext db, string? receiptNo, DateTime date,
        Customer? cust, (int prod, int qty)[] items, string payment, string channel, Random rng, DateTime? time = null)
    {
        var seq = db.Sales.Local.Select(s => s.ReceiptNo).Distinct().Count() + 1;
        var rcpt = receiptNo ?? $"POS-{1000 + seq}";
        var all = db.Products.Local.OrderBy(x => x.ProductId).ToList();
        var when = time ?? date.AddHours(rng.Next(10, 20)).AddMinutes(rng.Next(0, 60));
        var total = items.Sum(i => all[i.prod].Price * i.qty);
        var award = cust != null ? (int)(total / 100) : 0;

        var allocated = 0;
        for (var i = 0; i < items.Length; i++)
        {
            var (prodIdx, qty) = items[i];
            var p = all[prodIdx];
            var linePoints = cust == null ? 0
                : i == items.Length - 1 ? award - allocated
                : (int)(award * (p.Price * qty) / total);
            allocated += linePoints;
            db.Sales.Add(new Sale
            {
                ReceiptNo = rcpt,
                CustomerId = cust?.CustomerId,
                ProductId = p.ProductId,
                Quantity = qty,
                UnitPrice = p.Price,
                TotalAmount = p.Price * qty,
                Date = when,
                PaymentMethod = payment,
                Channel = channel,
                LoyaltyPointsEarned = linePoints
            });
        }
        if (cust != null && award > 0)
        {
            db.Loyalties.Add(new Loyalty
            {
                CustomerId = cust.CustomerId,
                PointsEarned = award,
                PointsRedeemed = 0,
                Date = when,
                Note = $"Earned from {rcpt}"
            });
        }
    }
}
