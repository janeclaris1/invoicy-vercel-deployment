# Linking Pricing Plans to Admin Dashboard & Receiving Payments

This guide explains how the **Pricing** section on the landing page can be connected to your **admin dashboard** so you can receive payments from clients and see who is on which plan.

---

## Current state

| Piece | What exists today |
|-------|-------------------|
| **Landing Pricing** | Displays Basic, Pro, Enterprise (GHS) with “Choose Basic”, “Choose Pro”, “Contact Sales” — **buttons do nothing** (no payment, no sign-up flow). |
| **Admin “Subscribed clients”** | Lists all **account owners** (users with `createdBy: null`). No plan name, no payment status, no subscription dates. |
| **User model** | No `plan`, `subscription`, or `paymentStatus` fields. |
| **Payments** | No payment provider (Stripe, Paystack, etc.) integrated. |

So right now: **pricing is display-only**, and **admin sees every registered account**, not “paying subscribers.”

---

## End-to-end flow (what we’re aiming for)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Landing page    │     │ Sign up / Login   │     │ Checkout        │
│ Pricing section │ ──► │ (with plan chosen)│ ──► │ (payment: card, │
│ "Choose Pro"    │     │ e.g. "Pro"        │     │ mobile money…)   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Admin dashboard │     │ Your backend     │     │ Payment provider │
│ Subscribed      │ ◄── │ saves plan +     │ ◄── │ (Stripe/Paystack)│
│ clients + plan  │     │ payment status   │     │ sends webhook    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

1. **Visitor** on landing page clicks e.g. “Choose Pro” on the Pricing section.
2. They are sent to **sign up** (or login) with the chosen plan (e.g. “Pro”) stored (URL param or session).
3. After sign up/login, they are sent to **checkout** (payment page) for that plan (e.g. Pro monthly/annual).
4. They pay via **payment provider** (card, mobile money, etc.).
5. **Provider** calls your **backend** (webhook or redirect) with “payment successful.”
6. **Backend** creates/updates a **subscription** (or user fields): plan name, amount, status, next billing date.
7. **Admin dashboard** “Subscribed clients” (or similar) reads this data and shows **who is on which plan** and **payment status**.

---

## What you need to build

### 1. Data: plan & subscription on the user (or separate model)

You need to store, per account (or per “subscription”):

- Plan identifier: e.g. `basic`, `pro`, `enterprise`
- Billing: e.g. `monthly` or `annual`
- Payment status: e.g. `active`, `past_due`, `cancelled`, `trial`
- Optional: amount paid, currency, next billing date, payment provider ID (e.g. Stripe/Paystack subscription ID)

**Option A – fields on User (simplest)**  
Add to `User` schema, e.g.:

- `plan: { type: String, enum: ['basic', 'pro', 'enterprise'], default: null }`
- `billingInterval: { type: String, enum: ['monthly', 'annual'], default: null }`
- `subscriptionStatus: { type: String, enum: ['active', 'past_due', 'cancelled', 'trial'], default: null }`
- `subscriptionCurrentPeriodEnd: { type: Date, default: null }`  
(and optionally amount, currency, provider IDs)

**Option B – separate Subscription model**  
One document per subscription (better if you want multiple plans over time or detailed history). User references it (e.g. `user.subscription` or `Subscription.findOne({ user })`).

Admin dashboard then shows: **name, email, plan, billing interval, status, (next billing date)**.

---

### 2. Landing page: wire “Choose plan” to sign up + plan

- **Pricing.jsx**: When user clicks “Choose Basic” or “Choose Pro”, **navigate** to sign up (or login) and **pass the chosen plan** (and optionally billing: monthly/annual), e.g.:
  - `/signup?plan=pro&interval=annual`
  - or store in `sessionStorage` and read after sign up.
- **Sign up / Login**:  
  - If coming from pricing, pre-fill or remember `plan` (+ `interval`) and after successful auth redirect to **checkout** (see below).  
  - If not from pricing, normal redirect (e.g. dashboard).

So: **Pricing section** → **Sign up/Login (with plan)** → **Checkout**.

---

### 3. Checkout & payment provider

You need a **payment provider** that supports your currency (e.g. GHS) and your region. Common options:

- **Paystack** (GHS, NGN, etc.) – good fit for Ghana.
- **Stripe** (many currencies; check GHS support).
- **Flutterwave** (Africa-focused).

Rough flow:

1. **Backend** creates a “checkout session” or “payment link” with the provider (amount, plan name, user id, success/cancel URLs).
2. **Frontend** redirects the user to that **payment URL** (or embedded checkout).
3. User pays on the provider’s page.
4. Provider redirects back to your app and/or calls a **webhook** on your backend with “payment successful” (and maybe subscription ID, amount, etc.).
5. **Backend** (in webhook or redirect handler):
   - Finds the user (by id or email from the payment metadata).
   - Sets (or creates) subscription: `plan`, `billingInterval`, `subscriptionStatus: 'active'`, `subscriptionCurrentPeriodEnd`, etc.
   - Optionally stores amount, currency, provider payment/subscription ID for records.

So: **Landing pricing** → **Sign up with plan** → **Checkout (provider)** → **Webhook/redirect** → **Backend updates User/Subscription** → **Admin sees plan + status**.

---

### 4. Admin dashboard: show plan and payment status

- **Backend**  
  - `GET /api/auth/clients` (or similar) already returns account owners.  
  - Extend the **User** (or Subscription) so each returned client includes: `plan`, `billingInterval`, `subscriptionStatus`, and optionally next billing date, amount.  
  - Only expose this to platform admin (you already have `isPlatformAdmin` and `PLATFORM_ADMIN_EMAIL`).

- **Frontend – Subscribed clients page**  
  - Add columns (or cards): **Plan**, **Billing**, **Status**, **Next billing** (and optionally amount paid).  
  - Optionally filter by plan or status (e.g. “Active only”).

So: **Admin dashboard “Subscribed clients”** = list of account owners **with** plan and payment status coming from the same backend that received the payment (via webhook/redirect).

---

## Summary: “How we link pricing to admin and start receiving payments”

| Step | What to do |
|------|------------|
| 1 | Add **plan + subscription fields** to User (or a Subscription model) and expose them in the clients API for platform admin. |
| 2 | On the **landing page**, make “Choose Basic” / “Choose Pro” **navigate to sign up (or login) with plan + interval** (e.g. query params or session). |
| 3 | After sign up/login with a plan, **redirect to checkout** (your backend creates a payment link/session with Paystack/Stripe/etc.). |
| 4 | Integrate a **payment provider** (e.g. Paystack for GHS): **webhook** (or redirect handler) that, on success, **updates User/Subscription** (plan, status, period end). |
| 5 | In the **admin dashboard**, **Subscribed clients** table reads plan + status from the same API and shows **who is on which plan** and **payment status**. |

Once steps 1–5 are in place, the **pricing section** is linked to **sign up → checkout → payment**, and the **admin dashboard** is linked to **receiving payments** by showing which clients have which plan and whether their subscription is active.

---

## Suggested order of implementation

1. **Backend**: Add `plan`, `billingInterval`, `subscriptionStatus` (and optional dates) to User; extend `GET /api/auth/clients` to return them.
2. **Frontend – Admin**: Add Plan, Status (and optional Next billing) columns to the Subscribed clients page.
3. **Frontend – Landing**: “Choose Basic” / “Choose Pro” → `/signup?plan=basic` (and similar for pro); after sign up, redirect to a **Checkout** page.
4. **Backend + Frontend**: Integrate one payment provider (e.g. Paystack): create payment link in backend, redirect user to it from Checkout page; implement webhook (or success URL handler) that sets `plan`, `subscriptionStatus: 'active'`, etc.
5. **Optional**: Enforce plan limits in the app (e.g. Basic = 100 invoices/month) and show “Upgrade” when limit is reached.

If you tell me your preferred payment provider (e.g. Paystack) and whether you want plan on User vs separate Subscription model, I can outline exact API routes, webhook payload handling, and the exact fields to add to your existing code.
