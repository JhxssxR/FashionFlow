# IT15 Final Project Documentation — CONTENT FOR FASHIONFLOW

Everything below is written to be pasted straight into the "IT15_PROJECT FINAL DOCS-V2" Word template, section by section.
Wherever the template needs an **image**, you'll see a line like `[SCREENSHOT: …]` telling you exactly what to capture.
Words in `[…]` are the only things you still need to fill in (your name, links, dates).

---

## 1) Cover / Header fields

| Template field | Paste this |
|---|---|
| NAME | [Your full name] |
| PROJECT TITLE | FashionFlow — Integrated Fashion Retail Management System |
| SUBJECT / CODE / TIME | IT15/L Integrative Programming and Technologies · [your section code] · [your schedule] |
| TOPIC (Type of Business Process) | Retail Sales & Inventory Management (Fashion Retail Business) — *adjust to the topic number your professor assigned* |
| LOGO | [SCREENSHOT/INSERT: `C:\Users\asus\Desktop\FashionFlow\frontend\public\assets\no background logo.png`] |

---

## 2) Products / Services

> Fashion apparel retail — an online clothing store (women's and men's wear: dresses, tops, bottoms, outerwear) with an integrated back office for point-of-sale (POS) selling, inventory, purchasing, supplier management, accounting, and a customer loyalty program.

---

## 3) Website / Deployed (Link)

> Currently running locally: `https://localhost:5268` (full system — storefront + back office).
> Deployed link: [add your deployment URL when deployed — e.g. your Render/Azure/ Railway URL]

*(If you deploy before submission, replace with the live URL — deployment is worth rubric points.)*

---

## 4) API / ALGO / MODEL

Paste this list (the template says "Ex. SAP, PayMongo API…"):

- **PayMongo Payments API** — real online payment gateway: creates hosted checkout sessions (GCash / Maya / Card) and calls our webhook when payment is settled; the order is only fulfilled after the webhook confirms payment.
- **JWT (JSON Web Token) Authentication** — issues signed 8-hour tokens at login; every API call carries the token, and the server reads the user's id/role claims from it.
- **BCrypt password hashing** — passwords are never stored in plain text (work factor 10 salted hashes).
- **Entity Framework Core (ORM) with LINQ** — all database reads/writes go through strongly-typed, parameterized queries (protection against SQL injection).
- **Token Bucket (fixed-window) Rate Limiter** — limits login attempts to 10 per minute per IP address (brute-force protection).
- **HMAC-SHA256 Signature Verification** — every PayMongo webhook call is verified against a shared webhook secret before it is processed.
- **Loyalty & Promotion Rule Engine (custom C# business rules — LoyaltyRules / PromoRules)** — computes loyalty points per ₱ spent, tier upgrades (Bronze → Silver → Gold → Platinum), promo eligibility (date window, category, tier) and discount amounts.

---

## 5) Security Features (short list for the header)

> Authentication & Authorization (JWT + Role-Based Access Control), Password Hashing (BCrypt), Input Validation (server-side stock/promo/field validation), Rate Limiting on login, Audit Logging & Monitoring (SystemLogs), Webhook Signature Verification (HMAC-SHA256), Parameterized Queries via Entity Framework Core (SQL-injection safe), Short-lived signed session tokens.

---

## 6) Target user/s

> Fashion retail business owners and staff (System Administrator, Inventory Manager, Purchasing Officer, Sales Staff/Cashier, Accountant), registered customers who shop online, and partner suppliers who log into a dedicated Supplier Portal.

---

## 7) Sub Systems / Management Transactions / Modules

1. User & Role Management Module (admin creates/invites accounts for all 7 roles)
2. Point-of-Sale (POS) Sales Module (walk-in transactions, receipts, daily summaries)
3. Inventory & Warehouse Module (stock levels, stock movements, low-stock alerts, adjustments)
4. Purchasing & Supplier Module (purchase orders, supplier records, delivery receiving)
5. Online Storefront & Checkout Module (product catalog, cart, PayMongo payment, order tracking)
6. Accounting & Financial Reports Module (sales/inventory/financial reports, payables & receivables)
7. Loyalty & Promotions Module (points earn/redeem, rewards store, voucher codes, promo campaigns)
8. Supplier Portal Module (suppliers view their own POs, confirm/ship/deliver, payments)
9. System Administration Module (system logs / audit trail, system settings, announcements)

---

## 8) Project Objectives (paste as your 3–5)

1. To build a centralized web-based system that connects the store's online sales channel and physical POS counter to one shared database, so stock, sales, and customer records are always consistent across channels.
2. To automate inventory control — every sale, delivery, and adjustment is recorded as a stock movement, with automatic low-stock alerts that trigger purchase orders to suppliers.
3. To implement a role-based access system where each user (admin, inventory, purchasing, sales, accountant, supplier, customer) sees only the subsystems and data appropriate to their role.
4. To integrate a real payment gateway (PayMongo) so online orders are only fulfilled after verified payment, using a secure, signature-checked webhook.
5. To reward repeat customers through a loyalty program (points per purchase, tier levels, redeemable reward vouchers) that is usable both at the POS and in online checkout.

---

## 9) Project Description (paste, then edit to taste)

FashionFlow is a full-stack web application for a fashion retail business, serving both its customers (online storefront) and its internal staff (back-office ERP). Customers browse products by category, pick a size and color, add to cart, and pay online through PayMongo (GCash, Maya, or card) or Cash on Delivery; staff manage POS sales, inventory, purchasing, suppliers, accounting, and loyalty from role-specific dashboards.

**Target users & requirements.** Store owners/admins need centralized control (users & roles, reports, audit logs, settings). Inventory managers need live stock counts and movement history. Purchasing officers need purchase-order tracking and supplier management. Sales staff need a fast POS terminal and customer records. Accountants need financial overviews and payables/receivables. Suppliers need a portal limited to their own purchase orders. Customers need a simple storefront, secure checkout, and their own order history and loyalty points.

**Impact.** The system removes manual, spreadsheet-based tracking: stock is automatically decremented per sale and incremented per delivery; every state change is written to an audit log; and online payments are reconciled automatically through the payment gateway's webhook. For the community of small fashion retailers, it demonstrates that enterprise-grade practices (role-based access, audit trails, real payment integration) are achievable with free/open technologies.

**Technology stack & why.**
- **Frontend:** React 19 + Vite (single-page app) with Recharts for dashboard charts — fast, component-based UI; hash-based routing keeps deployment simple behind one server.
- **Backend:** ASP.NET Core 10 Web API (C#) — cross-platform, high-performance, with built-in authentication, rate limiting, and dependency injection.
- **Database:** SQL Server via Entity Framework Core 10 — relational integrity for transactional data (sales, stock, orders) with code-first migrations.
- **Payments:** PayMongo Payments API — a PH-local gateway supporting GCash/Maya/cards.
- **Security:** JWT Bearer tokens, BCrypt.Net password hashing, ASP.NET Core rate limiting middleware.

These were chosen because they align with an integrated, multi-subsystem ERP requirement: one relational database for all modules, one API serving all roles, and real-world payment integration suitable for a Philippine retail business.

---

## 10) Type of Users / Role-Based Access (demo credentials)

The template shows 3 roles; FashionFlow has **7** (a strength — show them all). All are seeded demo accounts:

| # | Role | Username (email) | Password |
|---|---|---|---|
| 1 | System Administrator (Admin) | admin@fashionflow.com | @dm1n!@# |
| 2 | Inventory Manager | inventman@fashionflow.com | inv3ntm4n!@# |
| 3 | Purchasing Officer | purchase@fashionflow.com | purch453!@# |
| 4 | Sales Staff (POS) | sales@fashionflow.com | s4l3sPOS!@# |
| 5 | Customer | customer@fashionflow.com | cust0m3r!@# |
| 6 | Accountant | accountan@fashionflow.com | acc0unt4n!@# |
| 7 | Supplier | supplier@fashionflow.com | suppl13r!@# |

*(Note for your defense: these demo passwords are seeded in `DbSeed.cs` and are BCrypt-hashed in the database — show the `PasswordHash` column in SSMS to prove plain text is never stored.)*

---

## 11) Use Case Diagram (Role-Based Access)

`[SCREENSHOT/DIAGRAM: use-case diagram — 7 actors around one system boundary]`

Actors and their use cases (draw ovals for each line inside a "FashionFlow System" boundary):

- **System Administrator** — sign in, manage users & roles, view reports, view system logs, change system settings
- **Inventory Manager** — sign in, view stock overview, manage products & variants, record stock adjustments, receive supplier deliveries, view inventory reports
- **Purchasing Officer** — sign in, create purchase orders, manage suppliers, track PO status
- **Sales Staff** — sign in, process POS sale, void/record payment, manage customer records, manage promotions, view daily summary
- **Customer** — register, sign in, browse products, search products, add to cart, check out, pay online (PayMongo/COD), track orders, view loyalty points, redeem rewards
- **Accountant** — sign in, view financial overview, manage payables & receivables, generate financial reports
- **Supplier** — sign in, view own purchase orders, confirm/ship/deliver PO, view own catalog, view payments

(«include» / «extend» relations you can add: *Pay online* «include» *PayMongo payment*; *Check out* «include» *Sign in*; *Redeem rewards* «include» *Loyalty validation*.)

---

## 12) Data Dictionary

Paste one 4-column table (Field Names / Datatype / Length / Description) per database table, in this order.
All of these exist in SQL Server (check SSMS → your FashionFlow database → Tables).

**Note line to paste before the tables:** "String columns are stored as NVARCHAR; lengths shown are the system's field limits. PK = primary key (auto-increment identity), FK = foreign key."

### Users table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| UserId-PK | Int-AI | 9 | User's ID number |
| Name | Text | 100 | User's full name |
| Email | Text | 100 | User's email (unique, used to sign in) |
| PasswordHash | Text | 200 | BCrypt-hashed password (never plain text) |
| Role | Text | 50 | User's role (Admin, InventoryManager, PurchasingOfficer, SalesStaff, Customer, Accountant, Supplier) |
| DashboardKey | Text | 50 | Which dashboard the user lands on after sign-in |
| Status | Text | 20 | Account status (Active / Invited) |
| CustomerId-FK | Int | 9 | Linked customer profile (customers only) |
| SupplierId-FK | Int | 9 | Linked supplier profile (suppliers only) |

### Employees table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| EmpId-PK | Int-AI | 9 | Employee's ID number |
| UserId-FK | Int | 9 | User's ID number |
| EmpNumber | Text | 25 | Employee's company number |
| LastName | Text | 50 | Employee's last name |
| FirstName | Text | 50 | Employee's first name |
| MiddleName | Text | 50 | Employee's middle name |

### Customers table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| CustomerId-PK | Int-AI | 9 | Customer's ID number |
| Name | Text | 100 | Customer's full name |
| Email | Text | 100 | Customer's email (unique) |
| LoyaltyPoints | Int | 9 | Current redeemable loyalty points balance |
| Tier | Text | 20 | Loyalty tier (Bronze / Silver / Gold / Platinum) |
| JoinedDate | Date | 10 | Date the customer joined |

### Products table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| ProductId-PK | Int-AI | 9 | Product's ID number |
| Name | Text | 100 | Product style name |
| Variant | Text | 50 | Size / colour combination, e.g. "Medium / Brown" |
| Price | Decimal(18,2) | — | Selling price (₱) |
| OriginalPrice | Decimal(18,2) | — | Pre-discount price (non-null = shown on SALE) |
| Stock | Int | 9 | Canonical on-hand units (Main Warehouse) |
| Category | Text | 50 | ERP category (Outerwear, Dresses, Bottoms, Shirts, Tops) |
| StorefrontCategory | Text | 50 | Storefront filter (Women, Men, Outerwear) |
| ImageUrl | Text | 200 | Product photo file |
| IsNew | Bit | — | Shown as NEW arrival |
| IsActive | Bit | — | Available for selling (soft delete) |

### Inventories table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| InventoryId-PK | Int-AI | 9 | Inventory record ID |
| ProductId-FK | Int | 9 | Product's ID number |
| Quantity | Int | 9 | Units on hand in the warehouse |
| Warehouse | Text | 100 | Warehouse name/location |

### Suppliers table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| SupplierId-PK | Int-AI | 9 | Supplier's ID number |
| Name | Text | 100 | Supplier company name |
| Contact | Text | 100 | Contact person |
| Email | Text | 100 | Supplier email |
| Category | Text | 50 | Goods supplied (Denim, Fabrics, Tops & Tees…) |
| Address | Text | 200 | Supplier address |
| Rating | Decimal(3,1) | — | Supplier rating (0.0–5.0) |
| OnTimeRate | Int | 3 | On-time delivery rate (%) |

### PurchaseOrders table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| PurchaseId-PK | Int-AI | 9 | Purchase order record ID |
| PONumber | Text | 25 | PO number, e.g. PO-2026-0188 (unique) |
| SupplierId-FK | Int | 9 | Supplier's ID number |
| ProductId-FK | Int | 9 | Product being restocked |
| Quantity | Int | 9 | Units ordered |
| UnitCost | Decimal(18,2) | — | Cost per unit (₱) |
| Amount | Decimal(18,2) | — | Total order amount (₱) |
| Status | Text | 20 | Pending / Confirmed / In Transit / Delivered / Cancelled |
| IssuedDate | Date | 10 | Date the PO was issued |
| Eta | Date | 10 | Expected arrival date |
| DeliveredDate | Date | 10 | Date actually received |

### Sales table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| SaleId-PK | Int-AI | 9 | Sale line record ID |
| ReceiptNo | Text | 25 | Receipt number (POS-xxxx or FF-xxxxx) |
| CustomerId-FK | Int | 9 | Customer's ID (null = walk-in) |
| ProductId-FK | Int | 9 | Product sold |
| Quantity | Int | 9 | Units sold |
| UnitPrice | Decimal(18,2) | — | Price per unit at time of sale |
| TotalAmount | Decimal(18,2) | — | Line total (₱) |
| Date | Datetime | 19 | Date & time of sale |
| PaymentMethod | Text | 30 | Cash / Card / GCash / Maya / Online / Cash on Delivery |
| Channel | Text | 10 | POS (in-store) or Online |
| LoyaltyPointsEarned | Int | 9 | Points awarded on this line |

### Loyalties table (ledger)
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| LoyaltyId-PK | Int-AI | 9 | Ledger entry ID |
| CustomerId-FK | Int | 9 | Customer's ID number |
| PointsEarned | Int | 9 | Points earned in this entry |
| PointsRedeemed | Int | 9 | Points redeemed in this entry |
| Date | Datetime | 19 | Date & time of entry |
| Note | Text | 200 | Description (e.g. "Earned from FF-10245", "Redeemed: ₱200 OFF voucher — RWD-X7K2P9") |

### Promotions table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| PromotionId-PK | Int-AI | 9 | Promotion record ID |
| Code | Text | 25 | Promo/voucher code (unique, e.g. FF200, RWD-XXXXXX) |
| Description | Text | 200 | Human-readable description |
| DiscountType | Text | 20 | Percent / Fixed / Tier |
| DiscountValue | Decimal(18,2) | — | % off or ₱ off value |
| AppliesTo | Text | 50 | All / a category name / Clearance |
| ValidFrom | Date | 10 | Start of validity window |
| ValidTo | Date | 10 | End of validity window |
| Uses | Int | 9 | Times used |
| IsActive | Bit | — | Manually enabled/disabled (single-use vouchers flip to false) |

### Orders table (online checkout)
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| OrderId-PK | Int-AI | 9 | Order record ID |
| OrderNumber | Text | 25 | Order number, continues FF-1xxxx series (unique) |
| CustomerId-FK | Int | 9 | Ordering customer's ID |
| GuestEmail | Text | 100 | Contact email for the order |
| ShippingAddress | Text | 300 | Delivery address |
| ItemsSummary | Text | 300 | One-line summary ("Floral Wrap Dress ×1, Denim Jacket ×2") |
| Subtotal | Decimal(18,2) | — | Total before discounts |
| Discount | Decimal(18,2) | — | Promo/voucher discount applied |
| PromoCode | Text | 25 | Promo/voucher code used |
| Total | Decimal(18,2) | — | Amount payable (₱) |
| Status | Text | 20 | Pending / Paid / Cancelled / Failed |
| PaymentMethod | Text | 30 | Online / GCash / Maya / Card / Cash on Delivery |
| CheckoutSessionId | Text | 100 | PayMongo checkout session (cs_xxx) tying the webhook to this order |
| CreatedAt | Datetime | 19 | Date & time placed |
| PaidAt | Datetime | 19 | Date & time payment confirmed |

### OrderItems table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| OrderItemId-PK | Int-AI | 9 | Order line record ID |
| OrderId-FK | Int | 9 | Parent order's ID |
| ProductId-FK | Int | 9 | Product ordered |
| Quantity | Int | 9 | Units ordered |
| UnitPrice | Decimal(18,2) | — | Price per unit at checkout |

### StockMovements table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| MovementId-PK | Int-AI | 9 | Movement record ID |
| ProductId-FK | Int | 9 | Product moved |
| Quantity | Int | 9 | Units moved |
| Direction | Text | 10 | In (receiving) / Out (sale) |
| Date | Datetime | 19 | Date & time of movement |
| Reference | Text | 50 | Source document (receipt no., PO no., or "Adjustment") |

### Reports table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| ReportId-PK | Int-AI | 9 | Report record ID |
| Title | Text | 100 | Report title |
| Type | Text | 20 | Sales / Inventory / Financial |
| Date | Datetime | 19 | Date generated |
| GeneratedBy | Text | 100 | Email of the user who generated it |

### SystemLogs table (audit trail)
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| LogId-PK | Int-AI | 9 | Log entry ID |
| Time | Datetime | 19 | When the action happened |
| UserEmail | Text | 100 | Who performed the action |
| Action | Text | 300 | What was done (e.g. "POS sale POS-1042 completed") |
| Type | Text | 20 | Sales / Inventory / Purchasing / Supplier / Reports / System / Auth |

### AppSettings table
| Field Names | Datatype | Length | Description |
|---|---|---|---|
| Key-PK | Text | 100 | Setting name (e.g. LowStockThreshold) |
| Value | Text | 200 | Setting value |

*(Notifications table — only include this row of tables if the notification bell feature is live when you submit: NotificationId-PK Int-AI; UserId-FK Int; Title Text 200; Body Text 300; Type Text 20; Link Text 100; IsRead Bit; CreatedAt Datetime.)*

---

## 13) Entity Relational Diagram (ERD)

`[SCREENSHOT/DIAGRAM: ERD — draw from this relationship list]`

Entities and relationships (one-to-many unless marked):

- **Users** 1—0..1 **Employees** (Employees.UserId), 1—0..1 **Customers** (Users.CustomerId), 1—0..1 **Suppliers** (Users.SupplierId), 1—N **Notifications** (if included)
- **Customers** 1—N **Sales**, 1—N **Loyalties**, 1—N **Orders**
- **Products** 1—N **Inventories**, 1—N **Sales**, 1—N **StockMovements**, 1—N **PurchaseOrders**, 1—N **OrderItems**
- **Suppliers** 1—N **PurchaseOrders**
- **Orders** 1—N **OrderItems**

Suggested crow's-foot layout: Users in the center; Customers and Products in the middle ring (they have the most relations); Orders, OrderItems, Sales, PurchaseOrders, StockMovements, Loyalties around them; Employees, Suppliers, AppSettings, SystemLogs, Reports, Promotions on the outside.

---

## 14) Prototype (Frontend) — screenshot checklist with captions

The template requires **ALL transactions**. Run the app (`https://localhost:5268`), press `Win+Shift+S` per screen, and paste each screenshot with this label + description underneath.

**Storefront (as Customer or guest)**
1. *Storefront Home* — "Landing page with hero banner, new arrivals, and the promotions banner. Navigation to categories (Women, Men, Outerwear, Sale) and a live product search."
2. *Category / Search Results* — "Products filtered by category or search term; each card shows price, sale badge, and variant count."
3. *Product Modal with Size & Colour Picker* — "Clicking a product opens its details; the customer selects a size and colour, and the photo recolors to match the chosen variant."
4. *Cart Drawer* — "Slide-out cart showing line items, quantities, subtotal, and the promo/voucher code field."
5. *Checkout — Sign-in gate* — "Checkout requires an account; guests are redirected to sign in or create one (security)."
6. *Checkout — Shipping & Payment Method* — "Customer enters the delivery address and chooses GCash, Maya, Card, or Cash on Delivery."
7. *Payment Page (PayMongo hosted checkout)* — "Real PayMongo-hosted payment page for the chosen e-wallet/card." [or the mock-pay page if PayMongo keys are not configured]
8. *Thank You / Order Confirmation page* — "Order number confirmation after payment; the order is now in Purchase History and stock was already deducted."
9. *Sign In page* — "JWT login with rate limiting; wrong attempts are logged to SystemLogs."
10. *Create Account page* — "Customer self-registration, which creates the linked CRM/loyalty profile."

**Customer Dashboard** (sign in as customer@fashionflow.com)
11. *My Dashboard* — "Overview of lifetime spend, orders, points and current tier."
12. *Purchase History* — "All online orders with status (Pending/Paid) and points earned per order."
13. *Loyalty Points* — "Full earn/redeem ledger with running balance and tier."
14. *Rewards Store* — "Redeem points for single-use vouchers (₱200/₱500/₱800 off); the RWD- code is issued instantly."
15. *My Promotions* — "Active promo codes available to the customer."

**Admin Dashboard** (admin@fashionflow.com)
16. *Overview* — "Company-wide KPIs: revenue, orders, low-stock count, user counts, and sales charts."
17. *Users & Roles* — "Create/invite/edit accounts for all 7 roles; deactivate accounts."
18. *Reports* — "Sales, inventory and financial report generation."
19. *System Logs* — "Audit trail of every state-changing action (paginated), with the acting user's email — Logging & Monitoring evidence."
20. *System Settings* — "Global settings such as the loyalty earn rate and low-stock threshold."

**Inventory Manager** (inventman@fashionflow.com)
21. *Stock Overview* — "Live stock per product with critical/low-stock alerts."
22. *Products & Variants* — "Create/edit products and their size-colour variants."
23. *Stock Movements* — "Full in/out movement history with references (receipt/PO/adjustment)."
24. *Supplier Deliveries* — "Receive purchase orders into stock (increments inventory + writes movement)."
25. *Inventory Reports* — "Stock valuation and movement reports."

**Purchasing Officer** (purchase@fashionflow.com)
26. *Overview* — "Open POs, amounts payable, pending deliveries."
27. *Purchase Orders* — "Create POs for suppliers and move them Pending → Confirmed → In Transit → Delivered."
28. *Supplier Management* — "Supplier directory with ratings and on-time rates."
29. *Transaction Tracking* — "Status timeline of every purchase order."

**Sales Staff / POS** (sales@fashionflow.com)
30. *Today's Sales* — "Daily KPIs and receipts for the shift."
31. *POS Terminal* — "Walk-in sale: pick products + sizes, apply promo or loyalty, take Cash/Card/GCash/Maya payment, receipt issued."
32. *Customer Records* — "CRM list with loyalty points and tiers."
33. *Promotions & Loyalty* — "Create promo campaigns; view loyalty ledger."
34. *Daily Summary* — "End-of-day totals by payment method."

**Accountant** (accountan@fashionflow.com)
35. *Financial Overview* — "Revenue, cost, and profit charts."
36. *Payables & Receivables* — "Supplier payables and customer receivables (COD)."
37. *Financial Reports* — "Generate/export financial reports."

**Supplier Portal** (supplier@fashionflow.com)
38. *Portal Overview* — "The supplier's own KPIs (their POs only — role-scoped)."
39. *Purchase Orders* — "Supplier confirms / ships / marks deliveries; Delivered automatically updates the store's stock."
40. *My Products* — "Catalog derived from real POs: last cost, MOQ, lead time."
41. *Payments* — "Payments due/received for delivered POs."

---

## 15) Prototype (Backend) — source code screenshots + captions

Screenshot the code (VS Code or your editor) and use these captions. Files are in `backend/FashionFlow/`.

1. *`Controllers/AuthController.cs` — Login endpoint* — "Validates the BCrypt hash, returns a signed JWT with the user's role claims, and writes sign-in events (including failed attempts) to SystemLogs."
2. *`Services/TokenService.cs` — JWT issuance* — "Builds an 8-hour HMAC-SHA256-signed token carrying sub/name/email/role/customerId/supplierId claims."
3. *`Program.cs` — App configuration* — "Registers EF Core (SQL Server), JWT bearer authentication, rate limiting (10 logins/min/IP), and applies migrations + seeding on startup."
4. *`Controllers/SalesController.cs` + `Services/SaleService.cs` — POS sale pipeline* — "One shared service writes Sale lines, decrements stock, records StockMovements and awards loyalty points for both POS and online channels."
5. *`Controllers/PaymentsController.cs` — Online checkout* — "Validates stock and promo eligibility, creates the Order, then either fulfils COD immediately or creates a PayMongo checkout session and returns its hosted payment URL."
6. *`Controllers/PaymentsController.cs` — Webhook* — "Signature-verified (HMAC), idempotent webhook: only a genuine PayMongo 'checkout_session.payment.paid' event fulfils the order."
7. *`Services/OrderFulfillmentService.cs` — Fulfilment* — "Turns a paid order into real sales: re-checks stock, records the sale, burns single-use reward vouchers, and stamps Paid."
8. *`Services/PurchaseService.cs` — Delivery receiving* — "Marking a PO Delivered increases Product.Stock and Inventory.Quantity, and writes a StockMovement — the Purchasing→Inventory ERP connection."
9. *`Controllers/PortalController.cs` — Supplier Portal* — "Every route is scoped to the logged-in supplier's SupplierId claim, so a supplier can only ever see their own orders."
10. *`Controllers/LoyaltyController.cs` — Rewards redemption* — "Redeems points, issues an unguessable single-use RWD- voucher, writes the ledger entry, and recomputes the tier."
11. *`Services/LoyaltyRules.cs` & `Services/PromoRules.cs` — Business rule engine* — "Central, reusable rules for points per ₱ spent, tier computation, promo eligibility (dates/category/tier) and discount computation."
12. *`Services/Audit.cs` + SystemLogs usage* — "Every state-changing API call writes a SystemLog row (user email, action, type) — the audit trail behind the admin's System Logs page."
13. *`Data/FashionFlowDbContext.cs` — ORM context* — "Code-first EF Core context defining all 17 entities, unique indexes (emails, codes, order numbers) and decimal precision."
14. *`Data/DbSeed.cs` — Demo data seeding* — "Seeds the 7 demo accounts (BCrypt-hashed), suppliers, 70+ products with size/colour variants, sales, POs and logs on first run."

---

## 16) API Functions / Features — how it works text

Paste this intro + table, then screenshot evidence for the bolded ones (browser DevTools → Network tab shows the XHR calls; or SSMS shows the resulting rows):

> FashionFlow's single API (`/api`) serves all subsystems. The SPA calls it with the JWT; the server enforces role authorization, validation, and audit logging on every call.

| API / Feature | Route(s) | What it does |
|---|---|---|
| **Authentication** | POST /api/auth/login, /register, GET /api/auth/me | Issues/validates JWT; customer self-registration creates the linked loyalty profile |
| **Online checkout + PayMongo** | POST /api/checkout, POST /api/payments/webhook | Creates order → hosted payment → webhook fulfilment |
| **POS sales** | POST /api/sales | Records POS sale, stock deduction, loyalty award |
| **Inventory** | GET/POST /api/inventory, /api/inventory/low-stock, /adjust | Stock lists, low-stock alerts, adjustments |
| **Products** | GET/POST/PUT /api/products | Product & variant management |
| **Purchase orders** | GET/POST/PUT /api/purchase-orders | PO creation + status pipeline; Delivered = stock receiving |
| **Supplier portal** | GET/PUT /api/portal/… | Role-scoped PO status updates, catalog, payments |
| **Loyalty & rewards** | GET /api/loyalty/…, POST /api/loyalty/redeem | Ledger, tier, rewards store, voucher issuance |
| **Promotions** | GET/POST/PUT /api/promotions, POST /validate-promo | Campaign CRUD + checkout-time validation |
| **Users** | GET/POST/PUT /api/users | Admin-only user & role management |
| **Reports** | GET /api/reports/… | Sales/inventory/financial reports |
| **System logs** | GET /api/logs (admin) | Audit trail, paginated |

**Suggested evidence screenshots:** (a) DevTools Network tab during a checkout showing `POST /api/checkout` then the PayMongo redirect; (b) the webhook handling (show `VerifyWebhookSignature` code); (c) SSMS after a sale showing new Sale + StockMovement + Loyalty rows; (d) POS receipt + matching SystemLogs row.

---

## 17) Security Features — per-feature write-ups (paste under each screenshot)

1. **Authentication (JWT Bearer).** Passwords are verified against BCrypt hashes; on success the server issues an HMAC-SHA256-signed JWT valid 8 hours. `[SCREENSHOT: AuthController.Login + TokenService.CreateToken code; SSMS showing PasswordHash values]`
2. **Authorization (RBAC).** Every controller declares allowed roles, e.g. `[Authorize(Roles = "Admin,PurchasingOfficer")]`; a customer token calling a staff endpoint gets 403. `[SCREENSHOT: the attributes on PurchaseOrdersController; a 403 in DevTools]`
3. **Rate Limiting (brute-force protection).** Login is limited to 10 attempts/minute/IP; failures are logged. `[SCREENSHOT: Program.cs rate limiter block; a "Failed sign-in attempt" row in System Logs]`
4. **Input Validation.** Server-side checks for stock sufficiency, promo eligibility (dates/category/tier), duplicate emails, and `[Required]` DTO validation — the client is never trusted. `[SCREENSHOT: the stock-check loop in PaymentsController.Checkout]`
5. **Logging & Monitoring.** Every state-changing call writes a SystemLogs entry (who, what, when, module). `[SCREENSHOT: Admin → System Logs page]`
6. **Webhook security.** PayMongo webhooks are rejected unless the HMAC-SHA256 signature (shared secret) verifies, and fulfilment is idempotent — replays can't double-sell. `[SCREENSHOT: VerifyWebhookSignature + the idempotency check]`
7. **SQL-injection safety.** All queries go through EF Core LINQ (parameterized); no string-built SQL. `[SCREENSHOT: a LINQ query with a Where clause]`
8. **Session handling.** Short-lived signed tokens; expired/invalid tokens are cleared client-side and the user is bounced to sign-in. `[SCREENSHOT: client.js 401 handling]`

---

## 18) Footer

Date Submitted: [date] · Student's Signature: [sign]

---

### Reminder of what still needs images (nothing here — just images from you)
- Logo (file path in §1)
- Use-case diagram (§11) and ERD (§13) — draw from the lists above
- ~40 frontend screenshots (§14, captions provided)
- ~14 backend code screenshots (§15, captions provided)
- API evidence + 8 security screenshots (§16–17, listed above)
