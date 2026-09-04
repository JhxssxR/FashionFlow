# FashionFlow — Remaining Work Implementation Guide

> Companion to `IMPLEMENTATION.md` (which covers what is DONE — read that first).
> This document is the build plan for everything still missing, in recommended order.
> Status as of Sep 5, 2026: ERP core complete and verified; the items below are not started.

---

## Overview — what's left and why

| # | Item | Rubric point it satisfies | Est. effort |
|---|------|--------------------------|-------------|
| 1 | PayMongo online payments | API Integration + ERP approach | 2–3 sessions |
| 2 | Storefront cart & checkout | Frontend Components + ERP approach | together with #1 |
| 3 | Deployment (live URL) | Deployment | 1 session |
| 4 | Small polish (error boundary, refresh tokens, bundle split, seed re-date) | Error Handling / polish | optional |

Recommended order: **2 → 1 → 3** (build the cart first, then attach PayMongo to it, then deploy the whole thing once).

---

## 1. PayMongo (online payments)

PayMongo is the PH payment gateway in the project documentation. It supports GCash, Maya, grab_pay, cards and over-the-counter — which matches the payment methods the app already shows (Cash · GCash · Maya · Card).

### 1.1 Get API keys (no payment needed for test mode)

1. Create an account at <https://dashboard.paymongo.com> (sign-up is free; **test mode works immediately**, real money needs business verification — not required for a class demo).
2. Dashboard → **Developers → API Keys**. Copy:
   - `pk_test_...` (public key) and `sk_test_...` (secret key).
3. Store them **in user-secrets, never in the repo** (same policy as the JWT key):
   ```bash
   cd backend/FashionFlow
   dotnet user-secrets set "PayMongo:SecretKey" "sk_test_..."
   dotnet user-secrets set "PayMongo:PublicKey" "pk_test_..."
   ```
   In production they become environment variables `PayMongo__SecretKey` / `PayMongo__PublicKey`.

### 1.2 New Order entity (the piece that connects storefront → payments)

Payments need a "pending order" that PayMongo can settle. Add `Models/Order.cs`:

```csharp
public class Order
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = "";     // FF-10242 style, continues the FF- series
    public int? CustomerId { get; set; }              // null = guest checkout
    public string GuestEmail { get; set; } = "";      // used when CustomerId is null
    public string ItemsSummary { get; set; } = "";    // "Tulle Midi Dress ×1, Essential Crew Tee ×2"
    public decimal Subtotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "Pending";   // Pending | Paid | Cancelled | Failed
    public string? CheckoutSessionId { get; set; }    // PayMongo checkout_session id (co_xxx)
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    // navigation: OrderItems list (ProductId, Quantity, UnitPrice)
}
```

- Register `DbSet<Order> Orders` in `FashionFlowDbContext`, add `OrderItem` similarly, then
  `dotnet ef migrations add AddOrders` from `backend/FashionFlow`.
- Order numbers continue the seeded `FF-1xxxx` series (last is FF-10241 — compute max+1 like `PurchaseOrdersController` does for PO numbers).

### 1.3 Backend service — `Services/PayMongoService.cs`

PayMongo talks over HTTPS with **HTTP Basic auth** (secret key as username, empty password) and expects **amounts in centavos** (integers, PHP).

- **Create a checkout session** (the simplest integration — PayMongo hosts the payment page):
  `POST https://api.paymongo.com/v1/checkout_sessions`
  ```json
  { "data": { "attributes": {
      "line_items": [{ "name": "Tulle Midi Dress", "quantity": 1, "amount": 109800 }],
      "payment_method_types": ["gcash", "maya", "card"],
      "success_url": "https://<host>/#checkout/success",
      "cancel_url":  "https://<host>/#checkout/cancel",
      "description": "FashionFlow order FF-10242"
  }}}
  ```
  Response contains `data.attributes.checkout_url` — redirect the shopper there.
- **Verify webhooks**: PayMongo sends header `PayMongo-Signature: t=<ts>,te=...,li=...;hmac=<hex>`.
  Compute `HMACSHA256(hex)` of `"{t}.{rawRequestBody}"` with the **webhook secret** (`whsec_...`, created together with the webhook in step 1.5) and compare with a timing-safe compare. If it matches, trust the payload.
- Parse amounts back: centavos ÷ 100 → decimal. Use `HttpClient` from `IHttpClientFactory`; put the key in the Basic header as `Convert.ToBase64String(Encoding.UTF8.GetBytes(sk + ":"))`.

### 1.4 Backend endpoints — `Controllers/PaymentsController.cs`

| Endpoint | Auth | Behaviour |
|---|---|---|
| `POST /api/checkout` | Customer (or anonymous guest with email) | Validates stock → creates `Order` (Pending) + order items → calls PayMongo checkout session → stores `CheckoutSessionId` → returns `{ orderNumber, checkoutUrl }` |
| `POST /api/payments/webhook` | **[AllowAnonymous]** + signature check | On `checkout_session.payment.paid`: set Order → Paid, then run the **same pipeline as the POS charge** (reuse it — extract the POS logic in `SalesController.Charge` into a shared `SaleService`): write `Sale` rows with `Channel="Online"` + receipt `FF-…`, decrement `Products.Stock`/`Inventories`, add `StockMovement` "Out", award loyalty points, write `SystemLog`. Idempotent: skip if the order is already Paid. |
| `GET /api/orders/mine` | Customer | Order history for the customer dashboard (join to the purchase-history page) |

Guest checkout option: keep it simple for the demo — require login as Customer (the site already has accounts), or auto-create a Customer row from the checkout email. Logged-in is less code and earns the loyalty connection for free.

### 1.5 Register the webhook (needs a public URL — do this after deployment)

PayMongo must be able to reach the API, so webhooks only work once the app is deployed (step 3). Then:

1. Dashboard → **Developers → Webhooks → Add**, URL `https://<your-host>/api/payments/webhook`, events: `checkout_session.payment.paid` (and `payment.failed` if you want to mark Failed).
2. Copy the generated `whsec_...` → `dotnet user-secrets set "PayMongo:WebhookSecret" "whsec_..."` (env var in prod).
3. Local testing without deploying: use the PayMongo dashboard's "Send test webhook", or a tunnel (`ngrok http 5268`) and register the ngrok URL.

### 1.6 Frontend — cart + checkout (rubric: Frontend Components)

- **Cart state**: the Header already has a Cart button. Add `frontend/src/context/CartContext.jsx` (React context + `localStorage` persistence): `add(product, qty)`, `remove`, `setQty`, `clear`. Product cards get an "ADD TO CART" button (extends `.product-card` markup).
- **Cart drawer/page**: list items, qty steppers, subtotal (reuse `peso()`), "CHECKOUT" button.
- **Checkout page** (`#checkout`): shows the cart, collects name + email (prefill if logged in as customer) + address text → `POST /api/checkout` → `window.location = checkoutUrl`.
- **`#checkout/success`**: shows "Payment received — order FF-10242 confirmed", links to the customer dashboard's purchase history.
- **Customer dashboard**: add the Order rows to the existing purchase-history table (`/api/orders/mine` merged with `/api/sales/mine` or a unified endpoint).

### 1.7 Test-mode checklist (demo script)

- PayMongo test mode simulates GCash/Maya — the redirect shows a mock payment page with a "Pay" button; no real money moves.
- Card test numbers: `4343 4343 4343 4345` (success), any future expiry, any CVC.
- Demo flow to show the professor: add to cart → checkout with the customer account → PayMongo test page → pay → stock in SSMS/products page drops, loyalty points rise, order appears in purchase history, SystemLogs record it. **That single flow touches 6 modules — the ERP-approach money shot.**

---

## 2. Deployment (live URL for the rubric)

Recommended path — **Azure App Service + Azure SQL** (keeps the SQL Server provider, near-zero code change):

1. `npm run build` in `frontend/` (so `backend/FashionFlow/wwwroot` is current — the build ships with the app).
2. Azure: create **Azure SQL** (look for the free offer) → note the ADO.NET connection string; allow Azure services in the firewall.
3. `dotnet publish backend/FashionFlow -c Release -o publish` → deploy the folder (VS Code Azure extension or `az webapp up`).
4. App Service → **Environment variables** (never in appsettings):
   - `ConnectionStrings__Default` = the Azure SQL string (with `TrustServerCertificate=True`)
   - `Jwt__Key`, `PayMongo__SecretKey`, `PayMongo__PublicKey`, `PayMongo__WebhookSecret`
5. On first start the app runs `MigrateAsync` + seeds the demo data automatically — the same bootstrap as local.
6. Register the PayMongo webhook with the new URL (step 1.5) and set the checkout `success_url`/`cancel_url` to the deployed domain.

Alternative if Azure feels heavy: **Render/Railway** host the .NET app fine but have **no SQL Server** — you'd switch EF Core to the Npgsql provider and point at Supabase (regenerate the migration, reseed, re-test). Only take that path if there's spare time before submission.

Pre-submission DB chores: reseed so seeded dates are recent (drop DB → `dotnet ef database update` → restart), and re-date the seeded promotions if they've expired.

---

## 3. Polish backlog (optional, pick what time allows)

- **React error boundary** around `DashboardRouter` — one small component so a crashed panel shows a message instead of a white page.
- **Token refresh** — JWT expires after 8 h; the client already bounces to login on 401, which is acceptable; a refresh endpoint is bonus.
- **Bundle splitting** — the JS bundle is ~695 kB (recharts is heavy); `React.lazy` per dashboard would cut first paint. Cosmetic only.
- **Rate-limit note**: login is capped at 10/min/IP — during demos avoid rapid-fire wrong passwords.
- **README.md** at the repo root with run instructions + screenshots (graders read this first).

---

## 4. Definition of done

- [ ] Cart → checkout → PayMongo test payment → order Paid, stock decremented, loyalty earned (SSMS row check)
- [ ] Webhook signature verified; replaying a webhook does not double-create sales (idempotency)
- [ ] App reachable on a public URL, login + POS + storefront all working against Azure SQL
- [ ] Repo: all secrets in user-secrets/env vars only; README updated with the live URL
- [ ] IMPLEMENTATION.md §7 items checked off
