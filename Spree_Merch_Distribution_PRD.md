# PRD: Spree Merch Distribution Tool

## 1. Overview

A merch distribution management system for BITS Pilani Spree events. The system handles the full lifecycle: importing purchase data from Excel, letting customers confirm readiness for collection via a portal, generating OTPs for secure pickup, and providing distributors a portal to verify and mark items as distributed.

The system consists of three parts:

- **Backend**: New routes and models added to the existing **BPI Express.js** app (same MongoDB, same auth infrastructure). **In scope.**
- **Distributor Portal**: A standalone **Next.js (JavaScript)** app deployed on **Vercel**, consuming the BPI backend API. **In scope.**
- **Customer Interface**: New screens in the existing **Spree Flutter app** that call the customer API endpoints. **Out of scope for this PRD** — handled separately.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     EXISTING BPI APP                      │
│                   (Express.js on Azure)                    │
│                                                            │
│  Existing:  /login, /student, /vendor, /transaction        │
│                                                            │
│  NEW:       /merch/customer/*    (customer-facing API)     │
│             /merch/distributor/* (distributor-facing API)   │
│                                                            │
│  NEW Models: MerchOrder, MerchDistributor                  │
│  Emails:     AWS SES (existing nodemailer transporter)     │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────────┐  ┌──────────▼──────────┐
│  Spree Flutter App  │  │  Distributor Portal  │
│  (Existing mobile   │  │  (Next.js on Vercel) │
│   app)              │  │                      │
│  Google OAuth login │  │  Google OAuth login  │
│  View merch, book   │  │  Enter OTP, view     │
│                     │  │  merch, mark items   │
└────────────────────┘  └──────────────────────┘
```

---

## 3. Data Model

### 3.1 Excel Input Format (Reference)

The uploaded Excel has these columns:

| Column | Example | Notes |
|---|---|---|
| Timestamp | 3/25/2026 1:33:25 | Purchase timestamp |
| Email Address | f20230705@goa.bits-pilani.ac.in | BITS email |
| BITS ID | 2023B2A40705G | Unique student ID |
| NAME | Ajay Patil | Student name |
| Spree Theme Merch - ₹549/- | L | Size selected, or `null` if not purchased |
| Tennis Oversized Embroidered Tee - ₹499/- | L | Same pattern for all SKU columns |
| ... (more SKU columns) | ... | Dynamic — varies per Spree edition |
| Select Discount Applicable | 7 or more items → 10% off | Discount tier |
| I consent... | Yes | Consent column |
| (unnamed last column) | 5029.2 | Total amount |

Key observations:
- SKU columns are **dynamic** — their names and count change per event.
- A cell value of `null`/empty means the student did not buy that item.
- A non-null value (S, M, L, XL, etc.) is the **size** chosen.
- Some items may not have sizes (e.g., tote bags) — the value would be "Yes" or similar.

### 3.2 MongoDB Models (New)

There is **no MerchEvent model**. The system supports one event at a time. Between events, the developer wipes the `merchorders` collection via the import script and re-imports fresh data.

#### MerchOrder

One document per customer. Contains all their purchased SKUs.

```javascript
const MerchOrderSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true }, // BITS email
  bitsId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  items: [{
    skuId: { type: String, required: true },          // slug: "spree-theme-merch"
    displayName: { type: String, required: true },     // "Spree Theme Merch"
    size: { type: String, default: null },             // "L", "M", "XL", or null
    distributed: { type: Boolean, default: false },    // marked by distributor
    distributedAt: { type: Date, default: null },
    distributedBy: { type: String, default: null },    // distributor email
  }],
  booked: { type: Boolean, default: false },           // customer confirmed readiness
  bookedAt: { type: Date, default: null },
  otp: { type: String, default: null },                // 6-digit OTP, generated at import time
  createdAt: { type: Date, default: Date.now },
});

MerchOrderSchema.index({ otp: 1 });
```

#### MerchDistributor

Whitelist of emails allowed to access the distributor portal.

```javascript
const MerchDistributorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  addedAt: { type: Date, default: Date.now },
});
```

---

## 4. CLI Script: Data Import & Announcement

Since admin operations are developer-only via CLI, create a `scripts/` directory in the BPI repo.

### 4.1 `scripts/importMerch.js`

**Usage:**
```bash
node scripts/importMerch.js --file ./Spree_merch_data.xlsx
```

**Behavior:**

1. Read the Excel file using `exceljs` (already a BPI dependency).
2. Auto-detect SKU columns: any column between "NAME" and "Select Discount Applicable" is a SKU column. Extract the item name and price from the column header (parse the `- ₹XXX/-` suffix).
3. For each data row:
   - Skip rows where consent is not "Yes".
   - For each SKU column, if the cell is non-null and non-empty, create an item entry with the size value.
   - Generate a unique 6-digit numeric OTP for the order.
   - **Upsert** into `MerchOrder` by email — if a document for that email already exists, merge the new items into the existing items array (avoid duplicating SKUs that already exist). If no document exists, create one with the generated OTP.
4. Print summary: total orders upserted, total SKUs, any skipped rows.

This additive approach means the script can be run multiple times (e.g., if a second batch of orders comes in from a late form) without losing existing data. To start fresh for a new event, the developer manually drops the `merchorders` collection from Mongo before importing.

**Edge cases:**
- Handle rows with no purchases gracefully (skip).
- Duplicate email rows in the same Excel: merge items from all rows for that email.

### 4.2 `scripts/sendAnnouncement.js`

**Usage:**
```bash
node scripts/sendAnnouncement.js
```

**Behavior:**

This is the **only email** customers receive. It combines the announcement, their merch list, their OTP, and instructions to use the Spree Flutter app.

1. Fetch all MerchOrders from the collection.
2. For each order, send an email via the existing AWS SES transporter:
   - **From:** no-reply@devsoc.club
   - **To:** the customer's email
   - **Subject:** "Your Spree Merch is Ready for Collection!"
   - **Body:** Contains their merch items list, their unique OTP, and instructions to book via the Flutter app (see Section 8 for template).
3. Print summary: emails sent count, any failures.

**Rate limiting:** Send emails with a small delay (e.g., 100ms between sends) to respect SES rate limits.

### 4.3 `scripts/addDistributors.js`

**Usage:**
```bash
node scripts/addDistributors.js --emails "f20220511@goa.bits-pilani.ac.in,f20220123@goa.bits-pilani.ac.in"
```

Upserts emails into the `MerchDistributor` collection.

---

## 5. Backend API (New Routes in BPI)

All new routes are under `/merch`. Add to `index.js`:
```javascript
const merchRoutes = require("./routes/merch");
app.use("/merch", merchRoutes);
```

### 5.1 Customer Routes (`/merch/customer/*`)

All require JWT auth (existing `jwtAuth` + `studentAuth` middleware).

#### `GET /merch/customer/orders`

Returns the customer's merch order.

**Response:**
```json
{
  "order": {
    "booked": false,
    "items": [
      { "skuId": "spree-theme-merch", "displayName": "Spree Theme Merch", "size": "L", "distributed": false },
      { "skuId": "tennis-oversized-tee", "displayName": "Tennis Oversized Embroidered Tee", "size": "L", "distributed": false }
    ]
  }
}
```

If no order exists for this customer, return `{ "order": null }`.

#### `POST /merch/customer/book`

Customer confirms readiness for collection. This is just a status toggle — no email is sent (the OTP was already included in the announcement email).

**Request body:** _(none — uses authenticated user's email to find their order)_

**Behavior:**
1. Find the MerchOrder for this customer's email.
2. If no order exists, return 404.
3. If already booked, return the existing status.
4. Set `booked = true`, `bookedAt = now`.
5. Return `{ message: "Booked successfully.", booked: true }`.

### 5.2 Distributor Routes (`/merch/distributor/*`)

These routes require a new `distributorAuth` middleware.

#### Distributor Auth Flow

The distributor portal (Next.js on Vercel) uses Google OAuth. The flow:

1. Distributor signs in with Google on the Next.js app.
2. Next.js sends the Google ID token to `POST /merch/distributor/login`.
3. BPI backend verifies the Google token (same `verifyGoogleToken` util), checks if the email exists in `MerchDistributor` collection.
4. If authorized, returns a JWT with `{ email, role: "distributor" }`.
5. All subsequent distributor API calls use this JWT in the Authorization header.

**New middleware: `distributorAuth`**
```javascript
const distributorAuth = (req, res, next) => {
  if (req.user && req.user.role === "distributor") {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Distributors only." });
};
```

Update `config/passport.js` to also check `MerchDistributor` collection for the "distributor" role.

#### `POST /merch/distributor/login`

**Request body:**
```json
{ "token": "<google-id-token>" }
```

**Response:**
```json
{ "accessToken": "...", "role": "distributor" }
```

#### `POST /merch/distributor/lookup`

Distributor enters an OTP to look up a customer's order.

**Request body:**
```json
{ "otp": "123456" }
```

**Behavior:**
1. Find the MerchOrder matching `otp` where `booked = true`.
2. If not found, return 404 with error message.
3. Return the order details:

**Response:**
```json
{
  "orderId": "...",
  "name": "Ajay Patil",
  "bitsId": "2023B2A40705G",
  "email": "f20230705@goa.bits-pilani.ac.in",
  "items": [
    { "skuId": "spree-theme-merch", "displayName": "Spree Theme Merch", "size": "L", "distributed": false },
    { "skuId": "tennis-oversized-tee", "displayName": "Tennis Oversized Embroidered Tee", "size": "L", "distributed": true }
  ]
}
```

#### `POST /merch/distributor/distribute`

Mark individual SKUs as distributed.

**Request body:**
```json
{
  "orderId": "...",
  "skuIds": ["spree-theme-merch", "tennis-oversized-tee"]
}
```

**Behavior:**
1. Find the MerchOrder by ID.
2. For each skuId in the array, set `distributed = true`, `distributedAt = now`, `distributedBy = req.user.email`.
3. Save and return updated order.

**Response:**
```json
{
  "message": "Items marked as distributed.",
  "items": [ /* updated items array */ ]
}
```

#### `GET /merch/distributor/stats`

Returns distribution progress stats across all orders.

**Response:**
```json
{
  "totalOrders": 150,
  "bookedOrders": 120,
  "fullyDistributed": 85,
  "partiallyDistributed": 10,
  "pendingCollection": 25
}
```

---

## 6. Customer Interface (Flutter App — Out of Scope)

The customer-facing interface lives in the **existing Spree Flutter app** (not in the Next.js project). The Flutter app already has Google OAuth, secure storage, and API communication patterns in place (see `lib/Services/payments.dart`).

The Flutter app will need a new screen/flow that:

1. Calls `GET /merch/customer/orders` to fetch the customer's merch items.
2. Displays the list of items (name + size) and booking status.
3. Has a "Book for Collection" button that calls `POST /merch/customer/book`.
4. Shows distribution status per item (pending / collected).

**This PRD covers only the BPI backend additions and the Next.js distributor portal.** The Flutter app changes will be handled separately.

The customer API endpoints (Section 5.1) are still defined here since the backend must implement them, but the frontend consuming them is the Flutter app.

---

## 7. Distributor Portal (Next.js)

### 7.1 Tech Stack

- **Framework:** Next.js (JavaScript, App Router)
- **Styling:** Tailwind CSS
- **Auth:** Google OAuth via `next-auth` (restrict to whitelisted emails by validating against backend)
- **Deployment:** Vercel
- **API calls:** Fetch to the BPI backend (base URL from env var)

### 7.2 Environment Variables

```env
NEXT_PUBLIC_API_URL=https://quark26bpi.azurewebsites.net
GOOGLE_CLIENT_ID=<same-as-bpi>
GOOGLE_CLIENT_SECRET=<google-client-secret>
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://merch-distributor.vercel.app
```

### 7.3 Pages

#### `/` (Home / Login)
- If not authenticated, show Google sign-in button.
- On sign-in, send Google token to `POST /merch/distributor/login`.
- If backend rejects (email not in whitelist), show error: "You are not authorized as a distributor."
- On success, store the BPI JWT and redirect to `/distribute`.

#### `/distribute` (Main Distributor View)
- **OTP input field** — large, centered, numeric input with 6 boxes (like a PIN entry).
- **"Look Up" button** — calls `POST /merch/distributor/lookup` with the OTP.

On successful lookup, display:

- **Customer info card:** Name, BITS ID, Email.
- **Merch items table:**

| Item | Size | Status | Action |
|---|---|---|---|
| Spree Theme Merch | L | Pending | ☐ |
| Tennis Oversized Tee | L | Pending | ☐ |
| BITS Pilani Sweatshirt | L | Distributed | ✅ |

- Checkboxes for each pending item. Pre-checked items that are already distributed (disabled).
- **"Mark as Distributed" button** — sends selected skuIds to `POST /merch/distributor/distribute`.
- On success, update the table in place. Show a success toast.
- **"Next Customer" button** — clears the current view, resets OTP input.

#### `/stats` (Distribution Stats)
- Simple dashboard showing stats from `GET /merch/distributor/stats`.
- Numbers for: total orders, booked, fully distributed, partially distributed, pending.
- Optional: progress bar showing % distributed.

### 7.4 UX Considerations

- The OTP input should auto-focus and support paste (distributors will be entering these quickly).
- After marking items as distributed, keep the customer visible so the distributor can hand over remaining items.
- Mobile-friendly layout — distributors may use phones/tablets.
- Show clear error states for: invalid OTP, customer not booked, network errors.

---

## 8. Email Template

There is only **one email** per customer, sent via the `sendAnnouncement.js` script. It combines the announcement, merch list, OTP, and portal link.

**Subject:** Your Spree Merch is Ready — Book Your Collection Slot!

**Body:**
```
Hi {name},

Your Spree merch is ready for collection! Here's what you ordered:

{list of items with sizes}

Your collection OTP is:

{OTP}

To collect your merch:

1. Open the Spree app and go to the Merch section
2. Tap "Book for Collection" to confirm you're ready
3. On distribution day, show the OTP above at the counter

Do not share your OTP with anyone else.

— Team Spree
```

---

## 9. File Structure Changes

### BPI Backend (Existing Repo)

```
models/
  merchOrder.js          # MerchOrder model
  merchDistributor.js    # MerchDistributor model

controllers/
  merchCustomer.js       # Customer-facing controllers
  merchDistributor.js    # Distributor-facing controllers

routes/
  merch.js               # All /merch/* routes

scripts/
  importMerch.js         # CLI: import Excel data
  sendAnnouncement.js    # CLI: send announcement emails
  addDistributors.js     # CLI: add distributor emails

config/passport.js       # Updated: add distributor role lookup
utils/middleware.js       # Updated: add distributorAuth middleware
index.js                 # Updated: mount /merch routes
```

### Distributor Portal (New Repo: `spree-merch-portal`)

```
app/
  layout.js
  page.js                    # Home / login
  distribute/
    page.js                  # Main distributor OTP + distribute view
  stats/
    page.js                  # Distribution stats dashboard

components/
  OtpInput.js                # 6-digit OTP input component
  MerchTable.js              # Merch items table with checkboxes
  CustomerCard.js             # Customer info display
  StatsCard.js               # Stats display component

lib/
  api.js                     # API client (fetch wrapper with JWT)
  auth.js                    # next-auth config

public/
  ...

.env.local
next.config.js
tailwind.config.js
package.json
```

---

## 10. Security Considerations

- **OTP is numeric, 6 digits, no expiry, single-use per lookup context.** Since OTPs don't expire and the pool is only 1M combinations, add rate limiting on the lookup endpoint (e.g., 10 attempts per minute per distributor) to prevent brute force.
- **Distributor whitelist** is checked on login. JWT contains the role — backend validates role on every request.
- **Customer auth** uses the same Google OAuth + JWT flow as BPI. Only students with existing MerchOrders can see data.
- **CORS** on BPI backend must allow the Vercel domain for the distributor portal.
- **No sensitive financial data** is exposed — the portal only shows item names and sizes, not amounts or discounts.

---

## 11. Deployment Checklist

### BPI Backend (Azure)
1. Add new model files, controllers, routes, and scripts.
2. Update `config/passport.js` and `utils/middleware.js`.
3. Update CORS config in `index.js` to allow the Vercel domain.
4. Deploy to Azure as usual (existing GitHub Actions workflow).

### Distributor Portal (Vercel)
1. Create new repo `spree-merch-portal`.
2. Set up Next.js with App Router + Tailwind.
3. Configure `next-auth` with Google provider.
4. Set environment variables in Vercel dashboard.
5. Deploy.

### Pre-Distribution
1. (If new event) Manually drop the `merchorders` collection from MongoDB.
2. Run `node scripts/importMerch.js --file ./data.xlsx`.
3. Run `node scripts/addDistributors.js --emails "email1,email2,..."`.
4. Run `node scripts/sendAnnouncement.js`.

---

## 12. Flow Summary

```
Developer uploads Excel
        │
        ▼
  importMerch.js ──► MongoDB (MerchOrders upserted, OTPs generated)
        │
        ▼
  sendAnnouncement.js ──► Single email to each customer
                           (merch list + OTP + app instructions)
        │
        ▼
  Customer opens Flutter app ──► Sees merch list
        │
        ▼
  Customer taps "Book" ──► Confirms readiness (no email)
        │
        ▼
  Distribution day: Customer shows OTP (from email) to distributor
        │
        ▼
  Distributor enters OTP in Next.js portal ──► Sees customer's merch list
        │
        ▼
  Distributor checks off items ──► Marks as distributed
        │
        ▼
  Done. Stats page shows progress.
```
