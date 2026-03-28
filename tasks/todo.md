# Spree Merch Distribution — Implementation Plan

## Phase 1: Next.js Portal Setup
- [x] Explore both repos (BPI backend + spree-merchandise dir)
- [ ] Create GitHub repo `spree-merch-portal`
- [ ] Initialize Next.js app (App Router, Tailwind, JS)
- [ ] Install dependencies (next-auth, etc.)
- [ ] Commit: "chore: initial Next.js project setup"

## Phase 2: Next.js — Auth
- [ ] Configure next-auth with Google provider (`lib/auth.js`)
- [ ] Create API route for next-auth (`app/api/auth/[...nextauth]/route.js`)
- [ ] Build login page (`app/page.js`) — Google sign-in button, unauthorized error state
- [ ] Create BPI JWT exchange on sign-in (send Google token → BPI `/merch/distributor/login`)
- [ ] Protect `/distribute` and `/stats` routes with session check
- [ ] Commit: "feat: Google OAuth login with BPI JWT exchange"

## Phase 3: Next.js — API Client + Components + Pages
- [ ] `lib/api.js` — fetch wrapper that attaches BPI JWT from session
- [ ] `components/OtpInput.js` — 6-box PIN-style input
- [ ] `components/CustomerCard.js`, `MerchTable.js`, `StatsCard.js`
- [ ] `app/distribute/page.js` — OTP lookup + mark distributed
- [ ] `app/stats/page.js` — stats dashboard
- [ ] Commit per logical unit

## Phase 4: BPI Backend — Models + Auth
- [ ] `models/merchOrder.js`, `models/merchDistributor.js`
- [ ] Update `config/passport.js` + `utils/middleware.js`
- [ ] Commit: "feat: merch models and distributor auth"

## Phase 5: BPI Backend — Routes + Controllers
- [ ] `controllers/merchCustomer.js`, `controllers/merchDistributor.js`
- [ ] `routes/merch.js` + update `index.js`
- [ ] Commit: "feat: merch API routes and controllers"

## Phase 6: BPI Backend — CLI Scripts
- [ ] `scripts/importMerch.js`, `scripts/sendAnnouncement.js`, `scripts/addDistributors.js`
- [ ] Commit: "feat: CLI scripts"

## Notes
- BPI repo: `/Users/padmanabhansridhar/Desktop/bits-payment-interface`
- Portal: `/Users/padmanabhansridhar/Desktop/spree-merchandise` (Next.js app here)
- Existing SES transporter in `utils/nodemailer.js`
- ExcelJS already a BPI dependency
