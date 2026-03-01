# Live Integrations Guide

This guide explains how to move Integrations (and related features) from **localStorage demo** to **live** backend-backed integrations with real third-party services.

---

## 1. Overview

**Current state:** Connected apps, API keys, and webhooks are stored in the browser (`localStorage`). Nothing is synced or sent to external services.

**Live state:**
- **Backend** stores integration connections, encrypted API keys, and webhook configs per user/company.
- **OAuth 2.0** or **API key** flows connect real services (Stripe, QuickBooks, Gmail, etc.).
- **Webhooks** are invoked by your backend when events occur (e.g. invoice created, paid) so external systems can react.

---

## 2. Backend: What to Add

### 2.1 Database models

- **Integration** – Which app is connected (e.g. `stripe`, `quickbooks`), `userId`, `status` (`active` / `revoked`), optional `metadata` (e.g. Stripe account id).
- **IntegrationCredential** – Encrypted API keys or OAuth tokens per integration. Use a secret (e.g. `INTEGRATION_ENCRYPTION_KEY` in `.env`) and encrypt before saving; decrypt only when calling the external API.
- **WebhookConfig** – `userId`, `url`, `events[]`, `secret` (for HMAC signing), `active` (boolean). Stored in DB so the server can POST to these URLs when events fire.

### 2.2 API routes (under `/api/integrations` or `/api/webhooks`)

| Purpose | Method | Route | Description |
|--------|--------|--------|-------------|
| List connected | GET | `/api/integrations/connected` | Return integrations for current user. |
| Connect (start OAuth) | GET | `/api/integrations/oauth/:provider/start` | Redirect user to provider’s OAuth consent URL. |
| OAuth callback | GET | `/api/integrations/oauth/:provider/callback` | Exchange code for tokens, save in IntegrationCredential, redirect to app. |
| Connect (API key) | POST | `/api/integrations/connect` | Body: `{ provider, apiKey }`. Encrypt and store. |
| Disconnect | POST | `/api/integrations/:id/disconnect` | Mark integration inactive, optionally delete credential. |
| List available | GET | `/api/integrations/available` | Static list of providers (same as frontend list; can add “connected” flag from DB). |
| API keys (user-stored) | GET/POST/DELETE | `/api/integrations/api-keys` | CRUD for user’s named API keys (encrypted at rest). |
| Webhooks | GET/POST/PATCH/DELETE | `/api/integrations/webhooks` | CRUD for WebhookConfig. |

### 2.3 Webhook delivery (outgoing)

When something happens in your app (e.g. invoice created, invoice paid):

1. Load active `WebhookConfig` documents whose `events` include that event.
2. For each config, POST to `url` with a JSON body, e.g.:
   ```json
   { "event": "invoice.created", "timestamp": "...", "data": { "invoiceId": "...", ... } }
   ```
3. Add a header such as `X-Invoicy-Signature: HMAC-SHA256(body, config.secret)` so the receiver can verify the request.
4. Optionally retry on failure (with backoff) and log delivery status.

Put this logic in a small helper (e.g. `services/webhookDelivery.js`) and call it from your invoice (and other) controllers after creating/updating records.

---

## 3. OAuth 2.0 (e.g. Stripe, Google)

For providers that use OAuth (Gmail, Stripe Connect, QuickBooks, etc.):

1. **Register your app** in the provider’s developer console and get **Client ID** and **Client Secret**.
2. **Backend:**
   - `GET /api/integrations/oauth/:provider/start`: Build the provider’s authorization URL (with `state` = signed/encrypted user/session id), redirect the user there.
   - `GET /api/integrations/oauth/:provider/callback`: Exchange `code` for tokens, create/update `Integration` + `IntegrationCredential`, then redirect to your frontend (e.g. `/integrations/connected?connected=stripe`).
3. **Frontend:** “Connect” for an OAuth provider = open or redirect to `your-api/integrations/oauth/stripe/start` (or similar). After redirect back, show success and refresh the connected list from the API.

Store **tokens** in `IntegrationCredential` encrypted; use **refresh tokens** where the provider supports them so you can get new access tokens without the user re-authorizing every time.

---

## 4. API-key–only providers (e.g. SendGrid, some accounting APIs)

1. **Frontend:** User clicks “Connect”, enters API key in a form, submits to `POST /api/integrations/connect` with `{ provider: "sendgrid", apiKey: "..." }`.
2. **Backend:** Validate format if possible, encrypt the key (e.g. AES with `INTEGRATION_ENCRYPTION_KEY`), save in `IntegrationCredential` linked to the user’s `Integration` for that provider.
3. When you need to call the external API (e.g. send email), load the credential, decrypt, use the key in the request; never send the raw key to the frontend again.

---

## 5. Frontend: Switching from localStorage to API

The frontend already has `API_PATHS.INTEGRATIONS` in `src/utils/apiPaths.js`:

- `API_PATHS.INTEGRATIONS.CONNECTED` → GET connected list
- `API_PATHS.INTEGRATIONS.AVAILABLE` → GET available (with `connected` flag per app)
- `API_PATHS.INTEGRATIONS.CONNECT` → POST `{ provider, name?, category?, apiKey? }`
- `API_PATHS.INTEGRATIONS.DISCONNECT(id)` → POST to disconnect
- `API_PATHS.INTEGRATIONS.API_KEYS` → GET list, POST `{ name, value }` to add, DELETE `API_KEY_DELETE(id)` to remove
- `API_PATHS.INTEGRATIONS.WEBHOOKS` → GET list, POST to add, PATCH/DELETE `WEBHOOK(id)` to update/remove

1. **Connected page:** Replace `localStorage.getItem(STORAGE_KEY)` with `axiosInstance.get(API_PATHS.INTEGRATIONS.CONNECTED)`; disconnect with `axiosInstance.post(API_PATHS.INTEGRATIONS.DISCONNECT(id))`. Map backend response (e.g. `provider`, `name`, `category`, `connectedAt`) to your UI.
3. **Available page:** Fetch `INTEGRATIONS_AVAILABLE` (and optionally connected list) to show “Connected” badges; “Connect” either redirects to OAuth start or opens a modal that POSTs to `INTEGRATIONS_CONNECT` with API key.
4. **API keys page:** Replace localStorage with GET/POST/DELETE to `INTEGRATIONS_API_KEYS`. Never render raw secret in UI; backend can return a masked value.
5. **Webhooks page:** Replace localStorage with GET/POST/PATCH/DELETE to `INTEGRATIONS_WEBHOOKS`.

Use the same UI you have now; only the data source and “Connect” behavior change.

---

## 6. Security checklist

- **Encrypt** API keys and OAuth tokens at rest (e.g. AES-256 with a key from env).
- **Never** log or send decrypted secrets to the frontend.
- **Validate** webhook URLs (HTTPS, not internal IPs) and rate-limit webhook creation.
- **Sign** outgoing webhooks (e.g. HMAC) and document the header so subscribers can verify.
- **Use** short-lived OAuth access tokens and refresh them in the background; store refresh token encrypted.

---

## 7. Suggested order of work

1. Add backend models (`Integration`, `IntegrationCredential`, `WebhookConfig`) and migrations if needed.
2. Implement CRUD APIs for connected integrations, API keys, and webhooks (without OAuth first).
3. Replace frontend localStorage with these APIs so “Connected”, “API keys”, and “Webhooks” tabs work against the backend.
4. Add webhook delivery helper and call it from invoice (and other) lifecycle events.
5. Add one OAuth provider (e.g. Stripe or Google) end-to-end: start URL, callback, token storage, and “Connect” in the UI.
6. Add API-key flow for one provider (e.g. SendGrid); then replicate the pattern for others.

Once this is in place, “integrations” are live: data is stored server-side, and you can extend with real OAuth and API-key providers and outgoing webhooks as needed.
