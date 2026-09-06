# FashionFlow — Improvement Suggestions & Status

Created Sep 6, 2026 after the full module-wiring check (all module connections verified working —
see the chat summary for the sweep results). Items marked **✅ DONE** are already implemented and
running; items marked **▶ YOUR MOVE** need your accounts/decisions, not code.

---

## 1) ✅ DONE — Admin announcement board

The broadcast API (`POST /api/notifications/broadcast`) already existed but had no button.
**Added:** an "Send announcement" card on **Admin → Users & Roles** — type a title + message,
optionally target one role (or everyone), and every account's bell lights up instantly.

## 2) ✅ DONE — Online order delivery tracking

Orders used to stop at "Paid". **Added:**
- New staff endpoint `GET /api/orders` (all online orders, with customer names) and
  `PUT /api/orders/{orderNumber}/status` — forward-only pipeline **Paid → Shipped → Out for Delivery → Delivered**.
- New **Admin → Online Orders** page: every online order with its customer, items, payment method and
  a button for the next delivery step.
- The customer is **notified at every step** ("Your order FF-10242 has shipped — out for delivery soon",
  "delivered"), and Purchase History now shows the live delivery status.

## 3) ✅ DONE — One-click reorder from low stock

**Added:** a "Reorder suggestions" panel on **Purchasing → Overview** that lists every product at or
below the low-stock threshold (live from Inventory) with the suggested supplier and a **CREATE PO**
button that jumps to the Purchase Orders page with the product pre-filled — the Inventory →
Purchasing → Supplier chain in one click during a demo.

## 4) ✅ DONE — CSV export on reports

**Added:** a **DOWNLOAD CSV** button on the Accountant's financial report tables (and the admin
sales summary), generating a real `.csv` file client-side — no backend change needed.

## 5) ▶ YOUR MOVE — PayMongo test keys (rubric: API Integration 7 → 10)

The integration is fully built; it just needs keys (~10 min):
1. Sign up at https://dashboard.paymongo.com (free).
2. Developers → API Keys → copy the **test** Secret Key (`sk_test_…`).
3. In a terminal: `cd C:\Users\asus\Desktop\FashionFlow\backend\FashionFlow`
   then `dotnet user-secrets set "PayMongo:SecretKey" "sk_test_..."` and restart the app.
4. Checkout now goes to the real PayMongo hosted page (GCash/Maya/Card test payments).
Test mode is standard and rubric-acceptable for class demos.

## 6) ▶ YOUR MOVE — Deployment (rubric: Deployment 3 → 10)

Recommended path: **Azure App Service + Azure SQL** (EF Core's SQL Server provider works unchanged —
it's a connection-string swap). GitHub Student Pack includes Azure credits. Deploy, then register the
PayMongo webhook URL (`https://your-site/api/payments/webhook`) in the PayMongo dashboard. The
"Website/Deployed (Link)" field in your IT15 documentation also needs this URL.

## 7) ▶ YOUR MOVE — small cleanups

- **Midi Wrap Dress photo** still shows floral heels (pre-existing mismatch). Fixing it properly means
  regenerating the recoloured variant photos (black/blue) from the new base image — say the word and
  I'll do the recolour pass.
- **Instagram / TikTok / X footer icons** are still dead placeholders — send me the profile URLs and
  I'll wire them like the Facebook link.

---

### Module wiring check (Sep 6) — everything connected ✅

Users↔Auth (admin-created user logs in) · POS→stock→movement→loyalty→logs ·
Purchasing→Supplier Portal (PO + bell) · Supplier delivery→stock in + staff bells ·
Promo validation→checkout · Loyalty→voucher→discounted checkout (voucher burned) ·
Reports live · Logs capturing everything · Notifications fanning out to the right roles.
