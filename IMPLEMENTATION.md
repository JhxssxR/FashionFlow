# FashionFlow — Implementation Guide & Continuation Notes

> ERP & CRM for Clothing Businesses — IT15/L Integrative Programming and Technologies
> Student: Jhasser O. Antukan
> This document is the handoff for continuing development. Read this first before changing anything.

---

## 1. Project Summary

FashionFlow is an ERP and CRM system for clothing businesses. **The full stack is now wired end to end:**

- **ASP.NET Core Web API** (`Program.cs`, `Controllers/`) — JWT auth with role-based access, 13 controllers covering all 11 subsystem modules, SQL Server via EF Core.
- **React storefront + role dashboards** — every page now renders **live data from the API** (the mock `dashboardData.js` is deleted). Record tables, stat cards and charts are real.
- **SQL Server** (Express locally) — EF Core migration `InitialCreate` + one-time demo seed on an empty database.

**Stack per project documentation:** ASP.NET/C# backend ✓, SQL Server (Supabase as cloud option) ✓, PayMongo API for payments ✗ (not yet — see §7), React frontend ✓.

---

## 2. How to Run

```bash
# Backend + serving the built frontend (http://localhost:5268)
dotnet run --project backend/FashionFlow      # from repo root
# or: cd backend/FashionFlow && dotnet run
# (applies migrations and seeds if the DB is empty)

# Build the frontend (outputs to ../backend/FashionFlow/wwwroot — wipes and replaces it)
cd frontend
npm install                         # first time only
npm run build
```

- Repo layout: `backend/FashionFlow/` (ASP.NET Core project) + `frontend/` (React) + `FashionFlow.sln` + docs at the root. Build everything from the root with `dotnet build FashionFlow.sln`.
- Database: `localhost\SQLEXPRESS`, database `FashionFlow` (connection string in `backend/FashionFlow/appsettings.json`; Trusted_Connection, so no password).
- **JWT signing key is in user-secrets**, not in the repo: it was set with `dotnet user-secrets set "Jwt:Key" "<random>"` (run from `backend/FashionFlow/`). If you clone fresh, set it again (any 48+ char random string).
- Frontend dev with hot reload: `cd frontend && npm run dev` — Vite (5173) proxies `/api` to `localhost:5268` (configured in `vite.config.js`), and CORS for 5173 is enabled in Development.
- Reset the demo data: drop the database (`sqlcmd -S localhost\SQLEXPRESS -Q "ALTER DATABASE FashionFlow SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE FashionFlow;"`, then `dotnet ef database update` from `backend/FashionFlow`), restart — the seed re-runs on an empty DB.
- **Always `npm run build` BEFORE starting the server** — the static-files provider is created at startup; if `wwwroot` is missing then, assets 404 until the server restarts.

---

## 3. Roles & Demo Accounts

Login posts to `/api/auth/login` (BCrypt verify, rate-limited 10/min/IP) and returns a JWT with `role`, `customerId`/`supplierId` claims. The SPA stores it in `localStorage` (`ff_auth`) and the hash-router guard checks `dashboardKey` before rendering a dashboard; every API call re-checks server-side.

| Role | Email | Password | Dashboard route |
|---|---|---|---|
| System Administrator | admin@fashionflow.com | @dm1n!@# | `#dashboard/admin` |
| Inventory Manager | inventman@fashionflow.com | inv3ntm4n!@# | `#dashboard/inventory` |
| Purchasing Officer | purchase@fashionflow.com | purch453!@# | `#dashboard/purchasing` |
| Sales Staff (POS) | sales@fashionflow.com | s4l3sPOS!@# | `#dashboard/sales` |
| Customer | customer@fashionflow.com | cust0m3r!@# | `#dashboard/customer` |
| Accountant | accountan@fashionflow.com | acc0unt4n!@# | `#dashboard/accountant` |
| Supplier | supplier@fashionflow.com | suppl13r!@# | `#dashboard/supplier` |

The login page's demo chips prefill the email; the password is still typed and verified by the API. Supplier portal data is scoped to the logged-in supplier's `SupplierId` claim (customer/supplier users carry the link in their claims).

### RBAC map (enforced per-controller via `[Authorize(Roles = ...)]`)

- **Admin** — everything: users (invite/update), logs, settings, all reports, low stock.
- **InventoryManager** — products CRUD, stock adjust, movements, inventory reports.
- **PurchasingOfficer** — POs create/status, suppliers CRUD.
- **SalesStaff** — POS charge, sales views, customers CRUD, promotions read/validate.
- **Customer** — own orders (`/api/sales/mine`), own loyalty (`/api/loyalty/mine`, redeem), active promos only.
- **Accountant** — financial-summary, purchasing-summary, payables, report archive.
- **Supplier** — `/api/portal/*` scoped to own SupplierId, forward-only status pipeline.

---

## 4. Current Architecture

```
FashionFlow/
├── FashionFlow.sln             # solution (backend project; open this in Visual Studio)
├── IMPLEMENTATION.md           # this handoff
├── backend/FashionFlow/        # ASP.NET Core project
│   ├── Program.cs              # EF Core + JWT bearer + rate limiter + ProblemDetails + SPA fallback
│   ├── appsettings.json        # connection string + JWT issuer/audience (key lives in user-secrets)
│   ├── Migrations/InitialCreate*  # EF Core migration (applied automatically on startup)
│   ├── Models/                 # 15 entities + Dtos.cs (request records with validation annotations)
│   ├── Data/                   # FashionFlowDbContext + DbSeed (one-time demo seed)
│   ├── Services/               # TokenService, Roles, LoyaltyRules, PromoRules,
│   │                           # PurchaseService, ClaimsExtensions, Audit
│   ├── Controllers/            # auth, products, inventory, suppliers, purchase-orders, sales,
│   │                           # customers, loyalty, promotions, reports, portal (supplier),
│   │                           # users, admin (logs+settings)
│   └── wwwroot/                # built SPA output of `npm run build` (gitignored)
└── frontend/                   # React (Vite) app
    ├── vite.config.js          # outDir → ../backend/FashionFlow/wwwroot; dev proxy /api → :5268
    └── src/
        ├── App.jsx             # hash router + auth guard (#dashboard/<key> needs a matching ff_auth user)
        ├── utils.js            # peso/peso2/num, fmtDate/fmtDateTime, statusTone, CHART_COLORS
        ├── api/client.js       # fetch wrapper (token header, 401 → #login), useApi() hook
        └── components/
            ├── Login.jsx           # real POST /api/auth/login
            ├── NewArrivals.jsx     # products + active promotions from the API
            └── dashboard/
                ├── DashboardLayout.jsx   # sidebar + SIGN OUT + real user identity
                ├── DashboardShared.jsx   # StatCard, Panel, DataTable, Loading, ErrorNote …
                └── *Dashboard.jsx        # 7 dashboards, all API-wired
```

**Conventions:**
- Currency: `peso()` / `peso2()` from `utils.js` (₱, `en-PH`).
- API JSON is camelCase; ids are projected as `id`; dates as `yyyy-MM-dd` strings (format client-side with `fmtDate`).
- `useApi(path, deps)` returns `{ data, error, loading, reload }`. Panels render `<Loading />` / `<ErrorNote />`. Pass a "tick" state into `deps` and bump it to refetch after a mutation.
- New pages: add to `ROLE_CONFIG[role].pages` in `DashboardLayout.jsx`, then a `page === 'x'` branch in the dashboard component.
- Charts are aggregates of real rows (Sales, StockMovements, PurchaseOrders). Nothing on the dashboards is mocked anymore.

**Known quirks (do not regress):**
- `history.scrollRestoration = 'manual'` in `App.jsx` — the app manages its own scrolling.
- Storefront smooth-scroll needs the `setTimeout` + post-`load` settle dance in `NewArrivals.jsx`.
- `wwwroot` is gitignored; `npm run build` replaces it. Never commit it.
- The seed stamps "today" relative to the run date — if you demo right after midnight, reseed so "Today's Sales" isn't empty.

---

## 5. What the ERP connections are (graded rubric — demo script)

1. **POS sale (Sales → Inventory + Loyalty + Promotions):** log in as sales → POS Terminal → pick a customer, add items, type `FF200`, CHARGE. One transaction: validates stock, applies the promo, writes Sale lines, decrements Product.Stock + Inventory, adds StockMovement "Out", awards 1 pt/₱100 (Loyalty ledger + tier recompute), increments promo Uses, writes SystemLog. The receipt appears in Recent transactions immediately.
2. **Supplier delivery (Portal → Purchasing → Inventory):** log in as supplier → Purchase Orders → ACCEPT → SHIP → MARK DELIVERED. On Delivered, `PurchaseService` adds the qty into stock with a "In" movement and logs it. Watch the same product's stock rise on the storefront badge / inventory pages.
3. **PO creation (Purchasing → Portal):** as purchasing officer, the "Issue a purchase order" form creates a Pending PO (auto number `PO-YYYY-####`) that the supplier then sees in their portal.
4. **Reports (cross-module):** admin/accountant revenue = Sales; expenses = issued POs; payables = open POs; spend mix = PO amounts by supplier category; inventory value = Products × Stock.
5. **RBAC:** try reaching `/api/users` with the sales token → 403. Customer token against `/api/customers` → 403. Supplier sees only their own POs.

## 6. API quick reference

All under `/api` (camelCase JSON). Auth: `Authorization: Bearer <token>`.

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Products (public read) | `GET/POST/PUT/DELETE /products` |
| Inventory | `GET /inventory`, `POST /inventory/adjust`, `GET /inventory/low-stock`, `GET /inventory/movements`, `GET /inventory/movement-series`, `GET /inventory/summary` |
| Suppliers | `GET/POST/PUT /suppliers` |
| Purchasing | `GET/POST /purchase-orders`, `PUT /purchase-orders/{id}/status` |
| Sales | `POST /sales`, `GET /sales/today`, `GET /sales/recent`, `GET /sales?from&to`, `GET /sales/mine` |
| CRM | `GET/POST/PUT /customers` |
| Loyalty | `GET /loyalty/mine`, `POST /loyalty/redeem` |
| Promotions | `GET/POST/PUT /promotions`, `GET /promotions/active` (public), `POST /promotions/validate` |
| Reports | `GET /reports/sales-summary`, `/reports/purchasing-summary`, `/reports/financial-summary`, `GET /reports` |
| Supplier portal | `GET /portal/purchase-orders`, `PUT /portal/purchase-orders/{id}/status`, `GET /portal/payments`, `GET /portal/catalog` |
| Admin | `GET/POST/PUT /users`, `GET /users/by-role`, `GET /logs`, `GET/PUT /settings` |

## 7. Remaining work (next continuation)

> **Detailed build plan for everything below: [`REMAINING-IMPLEMENTATION.md`](REMAINING-IMPLEMENTATION.md)** — includes PayMongo key setup, entity/service/endpoint designs, the webhook flow, and the Azure deployment walkthrough.

1. **PayMongo integration** (in the docs, not built): payment intent on storefront checkout; POS keeps Cash/GCash-Manual.
2. **Deployment** (Deliverable rubric): `dotnet publish -c Release` → Azure App Service / Render; database → Azure SQL or Supabase; set `ConnectionStrings:Default` + `Jwt:Key` as host env vars; `npm run build` before publish so `wwwroot` ships.
3. **Storefront checkout flow** — the storefront has no cart/checkout yet; the POS covers transactions, but "Customer buys online" is only represented by seeded `FF-*` receipts.
4. Nice-to-haves: React error boundary around dashboards (fetch errors already show inline), refresh-token/expiry renewal, unit tests for PromoRules/LoyaltyRules, code-split the 694 kB JS bundle.
5. The seeded offers (SCHOOL15 etc.) are dated Sep–Dec 2026 — re-date before final submission if the demo is later.

## 8. Git & verification notes

- Branch `main`. This phase's work: EF Core foundation (models/DbContext/seed from previous session, fixed + compiled), full Web API, JWT RBAC, frontend wired to the API — all browser-verified (login, admin/sales/supplier/customer flows, POS charge with promo, supplier delivery raising stock, loyalty redeem).
- After frontend changes: `npm run build`, verify at http://localhost:5268.
- The in-app browser's synthetic clicks intermittently time out — not an app bug; real clicks work (verified).
