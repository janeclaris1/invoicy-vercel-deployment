# GRA QR Code Display – Evaluation & Procedure

## 1. Current State (Evaluation)

### Where GRA QR is referenced

| Location | Behavior |
|----------|----------|
| **InvoiceDetail.jsx** | Shows a GRA Verification QR block. If `invoice.graQrCode`, `invoice.graVerificationUrl`, or `invoice.graVerificationCode` exists: renders image (if data URL) or `<QRCode>` for URL/text. Otherwise shows placeholder "No QR". |
| **CreateInvoice.jsx** | Same logic: shows QR when `formData.graQrCode` / `graVerificationUrl` / `graVerificationCode` is set; otherwise "QR will appear after GRA verification." Form does **not** have inputs for these fields. |
| **Reports.jsx** (Tax report) | "Submit to GRA" submits a **period-level VAT return** via `graApi.submitVATReturn(vatData)`. On success, if `response.qr_code` exists, it shows a QR (generated via `api.qrserver.com`) and a "Verify on GRA Portal" link. This is **not** stored on any invoice. |

### Backend

- **Invoice model** (`Backend/models/invoice.js`): Schema does **not** define `graQrCode`, `graVerificationUrl`, or `graVerificationCode`. So these fields are **never persisted** (Mongoose drops them in strict mode).
- **createInvoice** (`invoiceController.js`): Reads `graQrCode`, `graVerificationUrl`, `graVerificationCode` from `req.body` and passes them into `new Invoice({ ... })`, but they are not in the schema, so they are not saved.
- **updateInvoice**: Does **not** read or update these GRA fields.

### GRA API (`Frontend/Invoicy/src/utils/graApi.js`)

- **submitVATReturn** – VAT return for a period; used by Reports. Response shape is assumed to include `response.qr_code` and `response.mesaage` (e.g. ysdcid, ysdcrecnum, ysdctime, ysdcintdata).
- **submitInvoice** – Per-invoice submission. It **does not** currently use or map any `qr_code` or verification URL from the response; the response shape is not defined in code.

### Summary

- **Display**: UI already supports showing a QR when a verification URL/code or image is present (InvoiceDetail + CreateInvoice).
- **Persistence**: GRA fields are not in the Invoice schema and are not updated on edit, so **no GRA QR data is ever stored**.
- **Source of QR**: 
  - Reports: one QR per VAT return (period), shown only on the Reports page, not linked to invoices.
  - No per-invoice "Submit to GRA" flow that fetches and saves a verification URL/QR for that invoice.

---

## 2. Procedure to Display GRA QR Code (End-to-End)

### Step 1: Persist GRA fields on Invoice

1. **Backend – Invoice schema**  
   In `Backend/models/invoice.js`, add optional fields so they are saved:
   - `graQrCode` (String) – e.g. data URL of QR image, or text/URL to encode as QR
   - `graVerificationUrl` (String) – verification URL from GRA (e.g. link to GRA portal)
   - `graVerificationCode` (String) – verification code or payload to encode as QR  

   Example (add inside `invoiceSchema` before the closing `});`):

   ```js
   graQrCode: { type: String },
   graVerificationUrl: { type: String },
   graVerificationCode: { type: String },
   ```

2. **Backend – updateInvoice**  
   In `Backend/controller/invoiceController.js`, in `updateInvoice`:
   - Read `graQrCode`, `graVerificationUrl`, `graVerificationCode` from `req.body`.
   - Include them in the object passed to `Invoice.findByIdAndUpdate(..., { ... }, { new: true })` so that when the user sets or clears GRA data (e.g. after verification), it is saved.

### Step 2: Source of the QR (choose one or both)

**Option A – Per-invoice submission (recommended if GRA supports it)**  
- In **InvoiceDetail.jsx** (and optionally CreateInvoice), add a "Submit to GRA" (or "Verify with GRA") button.
- On click: call `graApi.submitInvoice(invoiceData)` with the current invoice (number, date, billTo, items, totals, etc.).
- From the API response, read the verification URL or code (e.g. `response.qr_code` or `response.verificationUrl` – adjust to actual GRA response).
- Call backend `PUT /api/invoices/:id` with `graVerificationUrl` and/or `graVerificationCode` (and optionally `graQrCode` if you store a data URL).
- After success, refresh invoice data or update local state so the existing QR block in InvoiceDetail (and print) shows the new QR.

**Option B – Manual entry**  
- In **CreateInvoice.jsx** and **InvoiceDetail.jsx** (edit mode), add optional inputs: e.g. "GRA verification URL" or "Verification code".
- On save (create/update), send these in the invoice payload; backend will persist them after Step 1.
- Existing display logic (image if data URL, else `<QRCode value={...} />`) will then show the QR.

**Option C – Use period QR on invoices (optional, extra)**  
- When "Submit to GRA" succeeds on Reports, the response may contain a single QR/URL for the period.
- You could store that in a separate table or in user/org settings and show it on invoices that fall in that period. This is more involved and may not match GRA’s per-invoice verification model.

### Step 3: Display (already in place)

- **InvoiceDetail.jsx**: Already shows GRA QR when `invoice.graQrCode` or `invoice.graVerificationUrl` or `invoice.graVerificationCode` is set (image or `<QRCode>`).
- **CreateInvoice.jsx**: Same; once the backend returns these fields (e.g. when editing an invoice that has been verified), the preview will show the QR.
- Ensure the **public/print** view uses the same fields so the QR appears on the printed/PDF invoice.

### Step 4: GRA API response shape

- Confirm with GRA docs or staging the exact response of:
  - **submitVATReturn** (Reports): already assumed to have `response.qr_code` (and possibly `response.mesaage`).
  - **submitInvoice** (per-invoice): whether it returns a `qr_code`, `verificationUrl`, or similar, and map that into `graVerificationUrl` / `graVerificationCode` when saving to the invoice.

### Step 5: Optional improvements

- **Reports.jsx**: If the VAT return response includes a verification URL/code that could apply to multiple invoices in the period, consider offering "Save this verification to invoices in this period" and updating those invoices with the same URL/code (if GRA allows).
- **CreateInvoice**: If you add manual GRA fields (Option B), add `graVerificationUrl` / `graVerificationCode` to initial `formData` and to the create/update payload so they are sent to the backend.

---

## 3. Minimal Implementation Checklist

- [ ] Add `graQrCode`, `graVerificationUrl`, `graVerificationCode` to `Backend/models/invoice.js`.
- [ ] In `updateInvoice`, accept and update these three fields.
- [ ] (Optional) Add "Submit to GRA" on InvoiceDetail; call `graApi.submitInvoice`, then PATCH/PUT invoice with returned verification URL/code.
- [ ] (Optional) Add manual inputs for GRA verification URL/code on Create/Edit Invoice and send them in create/update payloads.
- [ ] Verify GRA staging response for `submitInvoice` and map response to the three fields above.
- [ ] Test: create/update invoice with a verification URL or code, confirm it persists and the QR appears on InvoiceDetail and in print/PDF.

---

## 4. Files to touch

| File | Change |
|------|--------|
| `Backend/models/invoice.js` | Add schema fields `graQrCode`, `graVerificationUrl`, `graVerificationCode`. |
| `Backend/controller/invoiceController.js` | In `updateInvoice`, read and update the three GRA fields. |
| `Frontend/Invoicy/src/pages/Invoices/InvoiceDetail.jsx` | Optionally add "Submit to GRA" button and logic to call API and save verification URL/code (and ensure QR block uses the same fields). |
| `Frontend/Invoicy/src/pages/Invoices/CreateInvoice.jsx` | Optionally add manual GRA URL/code fields to form and payload; ensure payload includes them on create/update. |
| `Frontend/Invoicy/src/utils/graApi.js` | If doing per-invoice submit: ensure `submitInvoice` returns and maps `qr_code` or verification URL from GRA response. |

Display of the GRA QR is already implemented; the missing piece is **persistence** (schema + update) and a **source** for the data (per-invoice GRA submit and/or manual entry).
