# Paystack integration – step-by-step guide

Use this guide to finish connecting Invoicy to Paystack so you can accept subscription payments (GHS).

---

## Step 1: Add your secret key to the backend

1. Open your backend **`.env`** file (in the `Backend` folder).
2. Set your Paystack secret key:

   ```env
   PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   - **Test (development):** use a key that starts with `sk_test_`
   - **Live (production):** use a key that starts with `sk_live_`

3. Set where users should land after payment:

   ```env
   FRONTEND_URL=http://localhost:5173
   ```

   - **Local:** `http://localhost:5173`
   - **Production:** your frontend URL, e.g. `https://your-app.vercel.app` (no trailing slash)

4. Save the file and **restart your backend** so it loads the new env vars.

---

## Step 2: Get your backend URL (for the webhook)

Paystack will send payment success events to your backend. You need a URL that is reachable from the internet.

- **Local development:** your machine is not reachable by Paystack. Use one of:
  - **ngrok:** run `ngrok http 8000`, then use the HTTPS URL it gives you (e.g. `https://abc123.ngrok.io`) as your “backend URL” in the steps below.
  - Or **deploy the backend** (e.g. Render) and use that URL.
- **Production:** use your deployed backend URL, e.g. `https://invoicy-api.onrender.com`.

Your **webhook URL** will be:

```text
https://YOUR-BACKEND-URL/api/subscriptions/webhook
```

Example: `https://invoicy-api.onrender.com/api/subscriptions/webhook`

---

## Step 3: Set the webhook in Paystack Dashboard

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com) and sign in.
2. Open **Settings** (gear icon) → **API Keys & Webhooks** (or **Webhooks**).
3. Under **Webhook URL**, paste:

   ```text
   https://YOUR-BACKEND-URL/api/subscriptions/webhook
   ```

   Replace `YOUR-BACKEND-URL` with your real backend URL (e.g. from ngrok or Render).

4. Save.

Paystack will send `charge.success` to this URL. Your app uses that to create the user and subscription after payment.

---

## Step 4: Confirm API keys and environment

- In the same **API Keys & Webhooks** page you can see:
  - **Test keys** (for development)
  - **Live keys** (for real payments)
- Use the **secret key** that matches the environment:
  - `.env` with `sk_test_...` → Test mode
  - `.env` with `sk_live_...` → Live mode (and switch Paystack to Live in the dashboard if needed)

---

## Step 5: Test the flow (with test keys)

1. Backend running with `PAYSTACK_SECRET_KEY=sk_test_...` and `FRONTEND_URL` set.
2. Frontend: go to **Pricing** → choose **Basic** or **Pro** → you’re sent to signup with plan.
3. Fill **name, email, password** → click **“Continue to payment”**.
4. You’re redirected to Paystack. Use [Paystack test cards](https://paystack.com/docs/payments/test-payments) (e.g. **4084 0840 8408 4081**, any future expiry, any CVC).
5. After “payment”, Paystack redirects to `FRONTEND_URL/login?payment=success` and calls your webhook.
6. On **Login** you should see the green “Payment successful! Your account has been created…” message. Log in with the same email and password; you should land on the dashboard with an active subscription.

If the webhook URL is wrong or the backend is down, the user may see success on Paystack but the account won’t be created. Check backend logs and Paystack **Developers → Webhooks** (or **Logs**) for errors.

---

## Step 6: Production checklist

When you go live:

| Item | What to do |
|------|------------|
| **Backend .env (on Render etc.)** | Set `PAYSTACK_SECRET_KEY=sk_live_...` and `FRONTEND_URL=https://your-app.vercel.app` |
| **Paystack Dashboard** | Switch to **Live** and use your **live** secret key in the backend. |
| **Webhook URL** | In Paystack (Settings → Webhooks), set the URL to your **production** backend, e.g. `https://invoicy-api.onrender.com/api/subscriptions/webhook`. |
| **HTTPS** | Backend and frontend must be served over HTTPS in production. |

---

## Quick reference

| Variable | Purpose |
|----------|--------|
| `PAYSTACK_SECRET_KEY` | Used to call Paystack API (initialize transaction) and to verify webhook signatures. |
| `FRONTEND_URL` | Base URL for redirect after payment (e.g. `.../login?payment=success` or `.../dashboard?payment=success`). |

**Webhook URL (in Paystack):**  
`https://YOUR-BACKEND-URL/api/subscriptions/webhook`

**Test card (GHS):** 5060 6666 6666 6666 666 (or see Paystack docs for other test cards).

If something fails, check (1) backend logs for Paystack or webhook errors, and (2) Paystack dashboard → Webhooks/Logs for delivery and response code of the webhook.
