import axiosInstance from "./axiosInstance";
import { API_PATHS } from "./apiPaths";
import graApi from "./graApi";

/**
 * Normalize GRA submit-invoice API payload into invoice field updates (same shapes as InvoiceDetail).
 */
export function buildGraFieldUpdatesFromSubmitResponse(data) {
  const res = data?.response || data?.data || data;
  const msgObj =
    typeof (res?.message ?? res?.mesaage ?? data?.message ?? data?.mesaage) === "object"
      ? res?.message ?? res?.mesaage ?? data?.message ?? data?.mesaage
      : null;
  const payloads = [res, data, msgObj].filter((obj) => obj && typeof obj === "object");
  const pick = (...keys) => {
    for (const key of keys) {
      for (const p of payloads) {
        const value = p?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
    }
    return null;
  };

  const qrCode = pick("qr_code", "qrCode", "verificationUrl", "verification_url");
  const qrCodeStr = qrCode != null ? String(qrCode).trim() : "";
  const verificationUrl = /^(https?:\/\/|data:)/i.test(qrCodeStr)
    ? qrCodeStr
    : String(pick("verificationUrl", "verification_url") || "").trim() || null;
  let verificationCode = pick("verificationCode", "verification_code", "ysdcintdata", "internalData");
  if (
    (!verificationCode || String(verificationCode).trim() === "") &&
    qrCodeStr &&
    !/^(https?:\/\/|data:)/i.test(qrCodeStr)
  ) {
    verificationCode = qrCodeStr;
  }
  const updates = {};
  if (verificationUrl && String(verificationUrl).trim()) updates.graVerificationUrl = String(verificationUrl).trim();
  if (verificationCode && String(verificationCode).trim()) updates.graVerificationCode = String(verificationCode).trim();
  if (qrCodeStr.startsWith("data:image")) updates.graQrCode = qrCodeStr;
  const sdcId = pick("ysdcid", "sdcId");
  if (sdcId != null) updates.graSdcId = String(sdcId).trim();
  const receiptNo = pick("ysdcrecnum", "receiptNumber");
  if (receiptNo != null) updates.graReceiptNumber = String(receiptNo).trim();
  const receiptDateTime = pick("ysdctime", "receiptDateTime");
  if (receiptDateTime != null) updates.graReceiptDateTime = receiptDateTime;
  const mrc = pick("ysdcmrc", "mrc");
  if (mrc != null) updates.graMrc = String(mrc).trim();
  const sig = pick("ysdcregsig", "receiptSignature", "signature");
  if (sig != null) updates.graReceiptSignature = String(sig).trim();
  const distributorTin = pick("distributor_tin", "distributorTin");
  if (distributorTin != null) updates.graDistributorTin = String(distributorTin).trim();
  const mcDateTime = pick("ysdcmrctime", "mcDateTime");
  if (mcDateTime != null) updates.graMcDateTime = mcDateTime;
  const flag = pick("flag");
  if (flag != null) updates.graFlag = String(flag).trim();
  const lineCount = pick("ysdcitems", "lineItemCount");
  if (lineCount != null) updates.graLineItemCount = Number(lineCount);
  const statusValue = pick("status");
  if (statusValue != null) updates.graStatus = String(statusValue).trim();
  return updates;
}

export function formatGraSubmitError(err) {
  const res = err?.response?.data;
  let msg =
    res?.message ||
    (err?.response?.status === 502 ? "GRA could not process the invoice. Check credentials and payload." : null) ||
    err?.message ||
    "Failed to submit to GRA.";
  if (res?.graStatus != null) msg += ` (GRA status: ${res.graStatus})`;
  if (res?.graStatus === 401) msg += " Check Company Reference and Security Key in Settings → Company.";
  return msg;
}

/** Submit saved invoice to GRA, persist returned fields, return latest invoice from API. */
export async function submitInvoiceToGraAndFetch(invoiceId) {
  const data = await graApi.submitInvoiceById(invoiceId);
  const updates = buildGraFieldUpdatesFromSubmitResponse(data);
  if (Object.keys(updates).length > 0) {
    await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(invoiceId), updates);
  }
  const refresh = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(invoiceId));
  return refresh.data;
}

/** Same preflight as invoice detail: team members may rely on owner creds on the backend. */
export async function canAttemptGraSubmit(user) {
  if (user?.graCredentialsConfigured) return true;
  try {
    await graApi.health();
    return true;
  } catch {
    return false;
  }
}
