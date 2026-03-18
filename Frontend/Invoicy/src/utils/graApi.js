import axiosInstance from "./axiosInstance";
import { API_PATHS } from "./apiPaths";

/**
 * GRA E‑VAT API (VER 8.2) client.
 *
 * Important: the frontend does NOT call GRA directly.
 * All GRA traffic goes through our backend proxy (/api/gra/*) which injects the
 * user's stored credentials (Company Reference + Security Key).
 */
export const graApi = {
  invoice: async (payload) => {
    const res = await axiosInstance.post(API_PATHS.GRA.INVOICE, payload);
    return res.data;
  },
  cancellation: async (payload) => {
    const res = await axiosInstance.post(API_PATHS.GRA.CANCELLATION, payload);
    return res.data;
  },
  note: async (payload) => {
    const res = await axiosInstance.post(API_PATHS.GRA.NOTE, payload);
    return res.data;
  },
  statementOfAccount: async (payload) => {
    const res = await axiosInstance.post(API_PATHS.GRA.STATEMENT_OF_ACCOUNT, payload);
    return res.data;
  },
  health: async () => {
    const res = await axiosInstance.get(API_PATHS.GRA.HEALTH);
    return res.data;
  },
  inventory: async (payload) => {
    const res = await axiosInstance.post(API_PATHS.GRA.INVENTORY, payload);
    return res.data;
  },
  invoiceCallback: async (payload) => {
    const res = await axiosInstance.post(API_PATHS.GRA.INVOICE_CALLBACK, payload);
    return res.data;
  },
  tinDetails: async (tin) => {
    const res = await axiosInstance.get(API_PATHS.GRA.TIN_DETAILS(tin));
    return res.data;
  },
  ghanaCardDetails: async (nationalId) => {
    const res = await axiosInstance.get(API_PATHS.GRA.GHANA_CARD_DETAILS(nationalId));
    return res.data;
  },
  // Backwards-compatible helper used by current invoice UI flow
  submitInvoiceById: async (invoiceId) => {
    const res = await axiosInstance.post(API_PATHS.GRA.SUBMIT_INVOICE, { invoiceId });
    return res.data;
  },
};

export default graApi;
