# How to Test GRA E-VAT Integration

Follow these steps to verify that invoice submission and GRA lookups work.

---

## 1. Prerequisites

- **Backend** running (e.g. `npm run dev` or `node server.js` in `Backend/`).
- **Frontend** running (e.g. `npm run dev` in `Frontend/Invoicy/`).
- **GRA test credentials** (from GRA for the staging environment):
  - **Company Reference** (e.g. `CXX000000YY-001`).
  - **Security Key** (e.g. the long key GRA provided).
- **Staging base URL** (default): `https://vsdcstaging.vat-gh.com/vsdc/api/v1`  
  Override in `Backend/.env`: `GRA_BASE_URL=https://vsdcstaging.vat-gh.com/vsdc/api/v1`

---

## 2. Test via the App (easiest)

### A. Configure GRA credentials

1. Log in to the app.
2. Go to **Settings** → **Company** (or the section where GRA API credentials are shown).
3. Enter:
   - **GRA Company Reference**
   - **GRA Security Key**
4. Save. The app uses these for all GRA calls (invoices and VAT returns).

### B. Test “Submit to GRA” on an invoice

1. Create or open a **tax invoice** (not a quotation or proforma).
2. Open the **invoice detail** page (click the invoice).
3. Click **“Submit to GRA”**.
4. **Success**: You see a success toast and, if GRA returns QR/verification data, it may be saved and shown on the invoice.
5. **Failure**: You see an error toast. Typical causes:
   - **“GRA credentials not configured”** → Set Company Reference and Security Key in Settings → Company.
   - **“Submit to GRA is only available for tax invoices”** → Convert the document to an invoice first.
   - **502 / “GRA could not process the invoice”** → Check credentials, TIN format, and that the payload matches GRA E-VAT VER 8.2 (e.g. required fields, date format, levies).

### C. Test VAT return (Reports)

1. Go to **Reports** → **Tax Report (GRA)**.
2. Choose the period and ensure the report has data.
3. Click **“Submit to GRA”**.
4. Check for success or error toasts (same credential/502 handling as above).

---

## 3. Test via API (curl / Postman)

You need a valid **auth token** (e.g. cookie or Bearer token after login). The examples below use a **cookie** or **Bearer token**; replace with your actual session.

### A. Get an auth token

- **Option 1 – Cookie**: Log in via the app in a browser, then in DevTools → Application → Cookies copy the auth cookie value (e.g. `token=...`).
- **Option 2 – Login API**:  
  `POST /api/auth/login` with `{ "email", "password" }` and use the token from the response (if your backend returns one) or rely on the cookie it sets.

### B. Submit an invoice to GRA

```bash
# Replace:
# - YOUR_BASE_URL (e.g. http://localhost:8000)
# - YOUR_AUTH_COOKIE_OR_BEARER (cookie string or "Bearer <token>")
# - INVOICE_ID (MongoDB _id of an existing tax invoice)

curl -X POST "http://localhost:8000/api/gra/submit-invoice" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_COOKIE_OR_BEARER" \
  -d '{"invoiceId": "INVOICE_ID"}'
```

If using Bearer token:

```bash
curl -X POST "http://localhost:8000/api/gra/submit-invoice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"invoiceId": "INVOICE_ID"}'
```

- **Success**: HTTP 200 and a JSON body from GRA (e.g. status, receipt number, QR URL).
- **Failure**:  
  - 400 → missing/invalid `invoiceId` or GRA credentials not set.  
  - 401 → not logged in or invalid token.  
  - 403 → invoice doesn’t belong to you.  
  - 502 → backend got an error from GRA; check `graStatus` and `graResponse` in the JSON body.

### C. TIN details (VER 8.2)

```bash
# Replace TIN with a valid test TIN (e.g. C0034186913)
curl -X GET "http://localhost:8000/api/gra/tin-details/C0034186913" \
  -H "Cookie: token=YOUR_AUTH_COOKIE_OR_BEARER"
```

Success: HTTP 200 and GRA response (e.g. `status`, `data.tin`, `data.name`, `data.address`).

### D. Ghana Card details (VER 8.2)

```bash
# Replace NATIONAL_ID with a valid national ID (e.g. GHA-000XXXXXX-2)
curl -X GET "http://localhost:8000/api/gra/ghana-card-details/GHA-000XXXXXX-2" \
  -H "Cookie: token=YOUR_AUTH_COOKIE_OR_BEARER"
```

---

## 4. What to expect from GRA

- **Staging**: Uses `vsdcstaging.vat-gh.com`. Responses and rules follow GRA’s staging environment.
- **Production**: Switch `GRA_BASE_URL` (and credentials) to the production VSDC URL when GRA provides it.
- **Errors**: The backend returns **502** when GRA rejects the request; the response body includes `message`, `graStatus`, and `graResponse` to help debug (e.g. invalid TIN, duplicate invoice number, validations).

---

## 5. Quick checklist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Set Company Reference & Security Key in Settings → Company | Saved; no error |
| 2 | Open a tax invoice and click “Submit to GRA” | Success toast or clear error message |
| 3 | (Optional) Call `GET /api/gra/tin-details/:tin` with auth | 200 + GRA TIN data or 502 with GRA error |
| 4 | (Optional) Call `POST /api/gra/submit-invoice` with `invoiceId` | 200 + GRA response or 4xx/502 with body |

If any step fails, check backend logs (and GRA `graResponse`) for the exact error from GRA.
