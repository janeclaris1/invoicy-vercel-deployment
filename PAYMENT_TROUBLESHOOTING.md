# Why payment might not be confirmed

After a customer pays with Paystack, the app confirms the payment only when the **backend webhook** runs and creates the subscription. The frontend then sees it when it calls `GET /api/auth/me`. If the webhook never runs or fails, the app stays on "Confirming your payment" and the subscription never appears.

---

## 1. Webhook URL not set in Paystack (most common)

Paystack must know where to send the `charge.success` event.

- Go to [Paystack Dashboard](https://dashboard.paystack.com) → **Settings** → **API Keys & Webhooks** (or **Webhooks**).
- Set **Webhook URL** to your **backend** URL, for example:
  - `https://YOUR-BACKEND.onrender.com/api/subscriptions/webhook`
  - Not the frontend URL (e.g. not `https://invoicy-vercel-deployment.vercel.app/...`).
- Save. Paystack will send `charge.success` to this URL only if it is set.

If this URL is wrong or empty, the webhook never runs and the subscription is never created.

---

## 2. Wrong or missing PAYSTACK_SECRET_KEY

The webhook uses `PAYSTACK_SECRET_KEY` to:

- Verify the webhook signature (wrong key → 401, request rejected).
- Call Paystack’s `transaction/verify` (wrong key → "Invalid key", subscription not created).

In your backend (e.g. Render):

- Use the **Secret Key** (`sk_live_...` or `sk_test_...`), not the Public Key.
- Get it from Paystack Dashboard → **Settings** → **API Keys**.
- Ensure the variable is exactly `PAYSTACK_SECRET_KEY` and that there are no extra spaces or quotes.

If the key is wrong, you may see "Invalid key" in logs and the subscription will not be created.

---

## 3. Backend not reachable when Paystack sends the webhook

- If the backend is on **Render** free tier, it can sleep after inactivity. The first request after sleep can be slow or time out. Paystack might give up and not retry forever.
- Mitigation: use a paid plan so the service stays up, or use a cron job (e.g. every 10–15 minutes) to hit your backend so it stays awake when you expect payments.

---

## 4. Webhook failing (signature or verify)

The backend now logs more detail when the webhook runs. In your backend logs (e.g. Render logs), check for:

- `"Paystack webhook: PAYSTACK_SECRET_KEY is not set"` → set the env var.
- `"Paystack webhook: missing x-paystack-signature header"` or `"no raw body"` → Paystack might not be hitting this app, or the request is being altered (e.g. by a proxy).
- `"Paystack webhook signature mismatch"` → wrong secret key or body changed in transit.
- `"Paystack verify failed"` with `paystackMessage: "Invalid key"` → wrong `PAYSTACK_SECRET_KEY`.
- `"Paystack webhook missing metadata"` or `"PendingSignup not found"` → payment was not started from your app’s signup flow, or the pending signup expired.

If you see `"Paystack webhook: subscription created"` with `userId`, `plan`, `interval`, the webhook succeeded and the user should have an active subscription (and `GET /api/auth/me` should return it).

---

## 5. User logs in before the webhook runs

Flow:

1. User pays → Paystack redirects to your frontend (e.g. `/login?payment=success`).
2. In parallel, Paystack sends the webhook to your backend.
3. The webhook creates the user (for new signup) and the subscription.

If the user logs in **before** the webhook has run, the user might not exist yet (new signup) or the subscription might not exist yet. They can retry after a few seconds or use "Go to dashboard now"; once the webhook has run, the next load or refresh will show the subscription.

---

## Quick checklist

| Check | Action |
|------|--------|
| Webhook URL in Paystack | Set to `https://YOUR-BACKEND-URL/api/subscriptions/webhook` (backend, not frontend). |
| PAYSTACK_SECRET_KEY | Set on backend (Render etc.) to the **secret** key from Paystack (sk_live_... or sk_test_...). |
| Backend reachable | Ensure the backend is running and not sleeping when the payment is made (e.g. keep Render service awake). |
| Logs | After a test payment, check backend logs for "Paystack webhook received" and "subscription created" or any of the warning messages above. |

After fixing the webhook URL and/or secret key, run a new test payment and check the logs to confirm the webhook runs and the subscription is created.
