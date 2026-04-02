import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { Loader2, Printer, Edit2, Save, X, FileText, Building2 } from "lucide-react";
import QRCode from "react-qr-code";
import axiosInstance from "../../utils/axiosInstance";
import graApi from "../../utils/graApi";
import { API_PATHS } from "../../utils/apiPaths";
import Button from "../../components/ui/Button";
import { formatCurrency } from "../../utils/helper";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCurrency = user?.currency || 'GHS';
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [graSubmitting, setGraSubmitting] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(id));
      const invoiceData = response.data || null;
      setInvoice(invoiceData);
      setPaymentAmount(invoiceData?.amountPaid || 0);
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
      setErrorMessage(error.response?.data?.message || "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  /* Isolate print output to the invoice card only (hide dashboard chrome, toolbars, hints). */
  useEffect(() => {
    if (!invoice) return undefined;
    document.body.classList.add("invoice-print-page");
    return () => document.body.classList.remove("invoice-print-page");
  }, [invoice]);

  useEffect(() => {
    const handler = () => fetchInvoice();
    window.addEventListener("currencyChanged", handler);
    window.addEventListener("invoicesUpdated", handler);
    return () => {
      window.removeEventListener("currencyChanged", handler);
      window.removeEventListener("invoicesUpdated", handler);
    };
  }, [fetchInvoice]);

  const lineItems = useMemo(() => {
    if (!invoice) return [];
    if (Array.isArray(invoice.item) && invoice.item.length > 0) return invoice.item;
    if (Array.isArray(invoice.items) && invoice.items.length > 0) return invoice.items;
    return [];
  }, [invoice]);

  const balanceDue = useMemo(() => {
    if (!invoice) return 0;
    const grandTotal = invoice.grandTotal || 0;
    const amountPaid = isEditingPayment 
      ? Number(paymentAmount || 0) 
      : (invoice.amountPaid || 0);
    return grandTotal - amountPaid;
  }, [invoice, isEditingPayment, paymentAmount]);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePayment = async () => {
    if (paymentAmount < 0) {
      toast.error("Payment amount cannot be negative");
      return;
    }

    setSaving(true);
    try {
      const response = await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(id), {
        amountPaid: Number(paymentAmount),
        paymentNote: paymentNote.trim() || undefined,
      });
      
      setInvoice(response.data);
      setIsEditingPayment(false);
      setPaymentNote("");
      toast.success("Payment updated successfully");
      // Refresh the page data
      const refreshResponse = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(id));
      setInvoice(refreshResponse.data);
    } catch (error) {
      console.error("Failed to update payment:", error);
      toast.error(error.response?.data?.message || "Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setPaymentAmount(invoice?.amountPaid || 0);
    setPaymentNote("");
    setIsEditingPayment(false);
  };

  const handleConvertToInvoice = async () => {
    const docType = (invoice?.type || "invoice").toLowerCase();
    if (!invoice || (docType !== "proforma" && docType !== "quotation") || invoice.convertedTo) return;
    const statusNorm = (invoice.status || "").toLowerCase();
    if (statusNorm !== "paid" && statusNorm !== "fully paid") return;
    setConvertLoading(true);
    try {
      const res = await axiosInstance.post(API_PATHS.INVOICES.CONVERT_TO_INVOICE(invoice._id));
      toast.success("Converted to invoice: " + (res.data?.invoice?.invoiceNumber || ""));
      if (res.data?.invoice?._id) navigate(`/invoices/${res.data.invoice._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to convert");
    } finally {
      setConvertLoading(false);
    }
  };

  const handleSubmitToGRA = async () => {
    if (!invoice || !id) return;
    const invType = (invoice.type || "invoice").toLowerCase();
    if (invType === "proforma" || invType === "quotation") {
      toast.error("Submit to GRA is only available for tax invoices. Convert this document to an invoice first.");
      return;
    }
    // Don't hard-block based on local user state only:
    // team members may use owner-level GRA credentials on the backend.
    if (!user?.graCredentialsConfigured) {
      try {
        await graApi.health();
      } catch (err) {
        const msg = err?.response?.data?.message || "Configure GRA credentials in Settings → Company (Company Reference and Security Key) to submit to GRA.";
        toast.error(msg);
        return;
      }
    }
    setGraSubmitting(true);
    try {
      const data = await graApi.submitInvoiceById(id);

      // Show success immediately when GRA accepts (no throw = success)
      toast.success("Invoice submitted to GRA successfully.");

      // GRA invoice response: distributor_tin, num, ysdcid, ysdcrecnum, ysdcintdata, ysdcregsig, ysdcmrc, ysdcmrctime, ysdctime, flag, ysdcitems, qr_code, status
      const res = data?.response || data?.data || data;
      const msg = res?.message ?? res?.mesaage ?? data?.message ?? data?.mesaage;
      const r = msg || res;
      const qrCode = res?.qr_code ?? data?.qr_code ?? r?.qr_code ?? res?.verificationUrl ?? data?.verificationUrl ?? r?.verificationUrl;
      const verificationUrl = (typeof qrCode === "string" && qrCode.trim() && /^(https?:\/\/|data:)/i.test(qrCode.trim()))
        ? qrCode.trim()
        : (res?.verificationUrl ?? data?.verificationUrl ?? r?.verificationUrl ?? null);
      const verificationCode = res?.verificationCode ?? data?.verificationCode ?? r?.ysdcintdata ?? res?.ysdcintdata ?? data?.ysdcintdata ?? r?.verificationCode;
      const updates = {};
      if (verificationUrl && String(verificationUrl).trim()) updates.graVerificationUrl = String(verificationUrl).trim();
      if (verificationCode && String(verificationCode).trim()) updates.graVerificationCode = String(verificationCode).trim();
      if (qrCode && String(qrCode).startsWith("data:image")) updates.graQrCode = qrCode;
      if (r?.ysdcid != null) updates.graSdcId = String(r.ysdcid).trim();
      if (r?.ysdcrecnum != null) updates.graReceiptNumber = String(r.ysdcrecnum).trim();
      if (r?.ysdctime != null) updates.graReceiptDateTime = r.ysdctime;
      if (r?.ysdcmrc != null) updates.graMrc = String(r.ysdcmrc).trim();
      if (r?.mrc != null && updates.graMrc == null) updates.graMrc = String(r.mrc).trim();
      const sig = r?.ysdcregsig ?? r?.receiptSignature ?? r?.signature;
      if (sig != null) updates.graReceiptSignature = String(sig).trim();
      if (r?.distributor_tin != null) updates.graDistributorTin = String(r.distributor_tin).trim();
      if (r?.ysdcmrctime != null) updates.graMcDateTime = r.ysdcmrctime;
      if (r?.flag != null) updates.graFlag = String(r.flag).trim();
      if (r?.ysdcitems != null) updates.graLineItemCount = Number(r.ysdcitems);
      if (r?.status != null || data?.status != null) updates.graStatus = String(r?.status ?? data?.status ?? "").trim();

      if (Object.keys(updates).length > 0) {
        await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(id), updates);
        const refresh = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(id));
        setInvoice(refresh.data);
      }
    } catch (err) {
      const res = err?.response?.data;
      // Prefer backend message (GRA error text); 502 = GRA rejected the request
      let msg =
        res?.message ||
        (err?.response?.status === 502 ? "GRA could not process the invoice. Check credentials and payload." : null) ||
        err?.message ||
        "Failed to submit to GRA.";
      if (res?.graStatus != null) msg += ` (GRA status: ${res.graStatus})`;
      if (res?.graStatus === 401) msg += " Check Company Reference and Security Key in Settings → Company.";
      toast.error(msg);
    } finally {
      setGraSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-black">{errorMessage || "Invoice not found."}</div>;
  }

  return (
    <>
      {/* Reference design invoice (Tailwind-only) */}
      <div className="hidden bg-[#F5F5F5] print:bg-white flex justify-center items-start min-h-screen py-10 print:min-h-0 print:py-0">
        <div className="bg-white max-w-[680px] w-full mx-auto p-12 shadow-md print:shadow-none">
          {/* Header */}
          <div className="text-center">
            <svg
              width="60"
              height="50"
              viewBox="0 0 60 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto"
            >
              {/* Ears */}
              <polygon points="8,28 0,8 18,18" fill="#222" />
              <polygon points="52,28 60,8 42,18" fill="#222" />
              {/* Head */}
              <ellipse cx="30" cy="30" rx="22" ry="18" fill="#222" />
              {/* Face mask */}
              <ellipse cx="30" cy="34" rx="14" ry="10" fill="#fff" />
              {/* Eyes */}
              <circle cx="22" cy="27" r="3.5" fill="#fff" />
              <circle cx="38" cy="27" r="3.5" fill="#fff" />
              <circle cx="22" cy="27" r="1.8" fill="#222" />
              <circle cx="38" cy="27" r="1.8" fill="#222" />
              {/* Nose */}
              <circle cx="30" cy="33" r="2" fill="#222" />
              {/* Dots on face */}
              <circle cx="23" cy="37" r="1.2" fill="#aaa" />
              <circle cx="30" cy="38" r="1.2" fill="#aaa" />
              <circle cx="37" cy="37" r="1.2" fill="#aaa" />
            </svg>

            <div className="text-xl font-black tracking-widest text-center mt-0.5">
              FOX
            </div>
            <div className="text-xs text-gray-400 tracking-widest text-center">
              network
            </div>
            <div className="mt-8" />
            <div className="mt-4">
              <div className="flex justify-center items-baseline">
                <span className="text-6xl font-black">VAT </span>
                <span className="text-6xl font-black italic font-serif">INVOICE</span>
              </div>
            </div>

          </div>

          {/* Payment Info + Bill To */}
          <div className="mt-10 flex">
            <div className="w-1/2">
              <div className="bg-[#4A9B8E] text-white text-xs font-bold uppercase px-3 py-1 inline-block mb-3">
                BILL FROM
              </div>
              <div className="text-sm text-gray-700 leading-7">
                <div>Bank Transfer</div>
                <div>{invoice.billFrom?.businessName || user?.businessName || "-"}</div>
                <div>{invoice.billFrom?.phone || user?.phone || "-"}</div>
              </div>
            </div>

            <div className="w-1/2 text-right">
              <div className="flex justify-end">
                <div className="bg-[#4A9B8E] text-white text-xs font-bold uppercase px-3 py-1 inline-block mb-3">
                  BILL TO
                </div>
              </div>
              <div className="text-sm text-gray-700 leading-7 text-right">
                <div className="font-bold">{invoice.billTo?.clientName || "-"}</div>
                <div>{invoice.billTo?.email || "-"}</div>
                <div>{invoice.billTo?.address || "-"}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-10 w-full">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#4A9B8E] text-white font-bold text-sm">
                  <th className="px-4 py-3 text-left">
                    <span className="flex-1">Item Description</span>
                  </th>
                  <th className="px-4 py-3 text-left w-16">Qty.</th>
                  <th className="px-4 py-3 text-left w-36">Unit Price</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.slice(0, 3).map((item, index) => (
                  <tr
                    key={index}
                    className={
                      index === 1 ? "bg-[#F9F9F9]" : "bg-white"
                    }
                  >
                    <td className="px-4 py-3 text-sm border-b border-gray-100">
                      {item.description || item.itemDescription || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">
                      {item.quantity || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">
                      {formatCurrency(item.unitPrice ?? item.itemPrice, userCurrency)}
                    </td>
                    <td className="px-4 py-3 text-sm border-b border-gray-100">
                      {formatCurrency(item.total ?? item.amount ?? 0, userCurrency)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-[#F0F0F0] font-bold text-sm">
                  <td className="px-4 py-3">Total Payment</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">
                    {formatCurrency(invoice.subtotal || 0, userCurrency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax + Grand Total */}
          <div className="mt-4 flex flex-col items-end">
            <div className="flex justify-between w-56 text-sm">
              <span>Tax</span>
              <span>{formatCurrency(invoice.totalVat || 0, userCurrency)}</span>
            </div>
            <div className="flex justify-between w-56 bg-[#4A9B8E] text-white font-bold px-3 py-2 mt-1">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.grandTotal || 0, userCurrency)}</span>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-10 flex">
            <div className="w-1/2">
              <div className="font-bold text-sm">Notes:</div>
              <div className="text-sm text-gray-600 mt-1">
                {invoice.paymentTerms || "-"}
              </div>
              <div className="border-t border-gray-300 mt-6 w-48" />
            </div>
            <div className="w-1/2 text-right flex flex-col items-end">
              <div className="text-sm mt-2">
                Date :{" "}
                {invoice.dueDate
                  ? moment(invoice.dueDate).format("MMMM D, YYYY")
                  : moment(invoice.invoiceDate).format("MMMM D, YYYY")}
              </div>

              <svg
                className="mt-4"
                width="120"
                height="50"
                viewBox="0 0 120 50"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10,35 Q20,10 30,30 Q35,40 40,25 Q50,5 60,28 Q65,38 75,22 Q85,8 95,30 Q100,38 110,28"
                  stroke="#222"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                />
                <line
                  x1="5"
                  y1="32"
                  x2="15"
                  y2="36"
                  stroke="#222"
                  stroke-width="2"
                />
              </svg>

              <div className="border-t border-gray-400 mt-2 w-40" />
              <div className="text-sm text-center mt-2">
                {invoice.billFrom?.businessName ||
                  user?.businessName ||
                  "-"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 flex items-start gap-4">
            <div className="w-16 h-16 border-2 border-gray-300 flex items-center justify-center text-gray-300 text-xs">
              QR
            </div>
            <div className="text-sm text-gray-600">
              <div>
                <span className="font-bold text-gray-800">More Info:</span>
              </div>
              <div>{user?.phone || invoice.billFrom?.phone || "-"}</div>
              <div>{user?.email || invoice.billFrom?.email || "-"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Old UI (kept for functionality, hidden for visuals) */}
      <div className="bg-[#F5F5F5] flex justify-center items-start min-h-screen py-10 print:bg-white print:min-h-0 print:py-0">
        <div className="bg-white max-w-[680px] w-full mx-auto p-12 shadow-md space-y-6 print:shadow-none print:p-0">
        <div className="flex items-center justify-between print:hidden">
          <div className="invoice-detail-page-header">
            <h1 className="text-2xl font-semibold text-black dark:text-black">Invoice Details</h1>
            <p className="invoice-detail-subheading text-sm text-black dark:text-black flex items-center gap-2 flex-wrap">
              #{invoice.invoiceNumber}
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${(invoice.type || "invoice") === "quotation" ? "bg-blue-100 text-blue-800 dark:bg-blue-100 dark:text-blue-800" : (invoice.type || "invoice") === "proforma" ? "bg-amber-100 text-amber-800 dark:bg-amber-100 dark:text-amber-800" : "bg-slate-100 text-slate-700 dark:bg-slate-100 dark:text-slate-700"}`}>
                {(invoice.type || "invoice") === "quotation" ? "Quotation" : (invoice.type || "invoice") === "proforma" ? "Proforma" : "Invoice"}
              </span>
              {invoice.convertedTo && (
                <Button size="small" variant="ghost" onClick={() => navigate(`/invoices/${invoice.convertedTo?._id || invoice.convertedTo}`)} className="text-xs text-black dark:text-black">
                  View converted invoice →
                </Button>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(invoice.type || "invoice") === "invoice" && (
              <Button
                variant="secondary"
                onClick={handleSubmitToGRA}
                disabled={graSubmitting}
                className="flex items-center gap-2 text-black dark:text-black"
              >
                {graSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                Submit to GRA
              </Button>
            )}
            {((invoice.type || "invoice") === "proforma" || (invoice.type || "invoice") === "quotation") && !invoice.convertedTo && (invoice.status === "Fully Paid" || invoice.status === "Paid") && (
              <Button variant="secondary" onClick={handleConvertToInvoice} disabled={convertLoading} className="flex items-center gap-2 text-black dark:text-black">
                {convertLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Convert to invoice
              </Button>
            )}
            {!isEditingPayment ? (
              <Button 
                variant="secondary" 
                onClick={() => setIsEditingPayment(true)} 
                className="flex items-center gap-2 text-black dark:text-black"
              >
                <Edit2 className="w-4 h-4" />
                Edit Payment
              </Button>
            ) : null}
          </div>
        </div>

        <div className="invoice-print-container bg-transparent dark:bg-transparent border-0 p-0 print:border-0 print:shadow-none shadow-none text-black dark:text-black">
          {/* Logo centered at top */}
        {((invoice.companyLogo && invoice.companyLogo.trim() !== "") || (user?.companyLogo && user.companyLogo.trim() !== "")) && (
          <div className="invoice-logo-wrap flex justify-center mb-4">
              <img
                src={invoice.companyLogo && invoice.companyLogo.trim() !== "" ? invoice.companyLogo : (user?.companyLogo || "")}
                alt="Company logo"
                className="h-14 w-14 object-contain rounded-xl bg-white p-2 invoice-print-logo"
              />
          </div>
        )}

        {/* Reference-style header inside the printable card */}
        <div className="text-center">
          <div className="text-xl font-black tracking-widest text-center">
            {invoice.billFrom?.businessName || user?.businessName || "-"}
          </div>
          <div className="text-xs text-gray-400 tracking-widest text-center">
            {invoice.billFrom?.email || user?.email || "-"}
          </div>
          <div className="mt-8 flex justify-center items-baseline">
            <span className="text-6xl font-black">VAT </span>
            <span className="text-6xl font-black italic font-serif">INVOICE</span>
          </div>
        </div>

        <div className="invoice-bill-from-to mt-12 text-left border-0 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-black table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[26%]" />
              <col className="w-[24%]" />
              <col className="w-[26%]" />
            </colgroup>
            <tbody>
              <tr>
                <td colSpan={2} className="px-1 py-2">
                  <div className="bg-[#4A9B8E] text-white text-[10px] font-bold uppercase px-3 py-1 inline-block">
                    BILL FROM
                  </div>
                </td>
                <td colSpan={2} className="px-1 py-2 text-right">
                  <div className="bg-[#4A9B8E] text-white text-[10px] font-bold uppercase px-3 py-1 inline-block">
                    BILL TO
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-1 py-1.5 font-medium">Customer Name:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words">{invoice.billTo?.clientName || "-"}</td>
                <td className="px-1 py-1.5 font-medium text-right">Vendor:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words text-right">{invoice.billFrom?.businessName || user?.businessName || "-"}</td>
              </tr>
              <tr>
                <td className="px-1 py-1.5 font-medium">Customer TIN:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words">{invoice.billTo?.tin || "-"}</td>
                <td className="px-1 py-1.5 font-medium text-right">Vendor TIN:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words text-right">{invoice.billFrom?.tin || user?.tin || "-"}</td>
              </tr>
              <tr>
                <td className="px-1 py-1.5 font-medium">Invoice No:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words">{invoice.invoiceNumber || "-"}</td>
                <td className="px-1 py-1.5 font-medium text-right">Phone:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words text-right">{invoice.billFrom?.phone || user?.phone || "-"}</td>
              </tr>
              <tr>
                <td className="px-1 py-1.5 font-medium">Invoice Date:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words">{invoice.invoiceDate ? moment(invoice.invoiceDate).format("MMM D, YYYY") : "-"}</td>
                <td className="px-1 py-1.5 font-medium text-right">Currency:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words text-right">{invoice.currency || userCurrency || "-"}</td>
              </tr>
              <tr>
                <td className="px-1 py-1.5 font-medium">Due Date:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words">{invoice.dueDate ? moment(invoice.dueDate).format("MMM D, YYYY") : "-"}</td>
                <td className="px-1 py-1.5 font-medium text-right">Served By:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words text-right">{user?.name || "-"}</td>
              </tr>
              <tr>
                <td className="px-1 py-1.5 font-medium">Address:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words">{invoice.billTo?.address || "-"}</td>
                <td className="px-1 py-1.5 font-medium text-right">Address:</td>
                <td className="px-1 py-1.5 whitespace-normal break-words text-right">{invoice.billFrom?.address || user?.address || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="invoice-line-items-table w-full border-separate border-spacing-0">
            <thead className="bg-[#1A3263]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-black border-b border-black">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-black border-b border-black">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-black border-b border-black">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-black border-b border-black">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-black">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-white">
              {lineItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-100 group transition-colors duration-150">
                  <td className="px-4 py-3 text-sm text-black dark:text-black group-hover:text-black border-r border-black border-b border-gray-300">{item.sn || index + 1}</td>
                  <td className="px-4 py-3 text-sm text-black dark:text-black group-hover:text-black border-r border-black border-b border-gray-300">
                    {item.description || item.itemDescription || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-black group-hover:text-black border-r border-black border-b border-gray-300">{item.quantity || "-"}</td>
                  <td className="px-4 py-3 text-sm text-black dark:text-black group-hover:text-black border-r border-black border-b border-gray-300">
                    {formatCurrency(item.unitPrice ?? item.itemPrice, userCurrency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-black group-hover:text-black border-b border-gray-300">
                    {formatCurrency(item.total ?? item.amount ?? 0, userCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Left: Notes | Right: Tax summary + QR */}
        <div className="invoice-gra-and-tax mt-6 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 bg-transparent dark:bg-transparent text-black dark:text-black rounded-xl p-0 dark:p-0">
          {/* Left column: Notes */}
          <div className="flex flex-col gap-4">
            <div className="text-sm">
              <div>Notes: {invoice.notes || "-"}</div>
              <div>Payment Terms: {invoice.paymentTerms || "-"}</div>
            </div>
            {(invoice.graSdcId ||
              invoice.graReceiptNumber ||
              invoice.graVerificationCode ||
              invoice.graReceiptSignature ||
              invoice.graMrc ||
              invoice.graReceiptDateTime ||
              invoice.graLineItemCount != null) && (
              <div className="text-xs text-black dark:text-black border border-slate-200 rounded-lg p-3 bg-white/60">
                <div className="font-semibold mb-2">GRA E‑VAT Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <div><span className="font-medium">SDC ID:</span> {invoice.graSdcId || "-"}</div>
                  <div><span className="font-medium">RECEIPT NUMBER:</span> {invoice.graReceiptNumber || "-"}</div>
                  <div className="sm:col-span-2"><span className="font-medium">INTERNAL DATA:</span> {invoice.graVerificationCode || "-"}</div>
                  <div className="sm:col-span-2 break-all"><span className="font-medium">SIGNATURE:</span> {invoice.graReceiptSignature || "-"}</div>
                  <div><span className="font-medium">MRC:</span> {invoice.graMrc || "-"}</div>
                  <div>
                    <span className="font-medium">DATE &amp; TIME:</span>{" "}
                    {invoice.graReceiptDateTime ? moment(invoice.graReceiptDateTime).format("dddd, MMMM D, YYYY h:mm A") : "-"}
                  </div>
                  <div><span className="font-medium">LINE‑ITEM COUNT:</span> {invoice.graLineItemCount != null ? invoice.graLineItemCount : "-"}</div>
                </div>
              </div>
            )}
            {invoice.graVerificationUrl && /^https?:\/\//i.test(invoice.graVerificationUrl) && (
              <a href={invoice.graVerificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-90 hover:opacity-100">
                Verify on GRA portal →
              </a>
            )}
          </div>
          {/* Right column: Subtotal, tax details, and GRA QR (bottom right like GRA sample) */}
          <div className="text-sm space-y-2 flex flex-col items-end">
            {(invoice.vatScenario === "exclusive" || invoice.vatScenario === "inclusive") && (
              <p className="text-xs text-gray-500 dark:text-gray-400 w-full max-w-xs text-right">
                {invoice.vatScenario === "exclusive" ? "VAT exclusive" : "VAT inclusive"}
              </p>
            )}
            <div className="flex items-center justify-between w-full max-w-xs gap-4">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, userCurrency)}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4">
              <span>VAT</span>
              <span>{formatCurrency(invoice.totalVat, userCurrency)}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4">
              <span>NHIL</span>
              <span>{formatCurrency(invoice.totalNhil, userCurrency)}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4">
              <span>GETFUND</span>
              <span>{formatCurrency(invoice.totalGetFund, userCurrency)}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4">
              <span>Total Discount</span>
              <span>{formatCurrency(invoice.totalDiscount, userCurrency)}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4 font-semibold">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.grandTotal, userCurrency)}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4">
              <span>Amount Paid</span>
              {isEditingPayment ? (
                <div className="flex flex-col items-end gap-2 w-full max-w-xs">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-24 min-w-0 flex-shrink-0 px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white dark:bg-white text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-500"
                      placeholder="0.00"
                    />
                    <Button
                      size="small"
                      onClick={handleSavePayment}
                      disabled={saving}
                      className="flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </Button>
                  </div>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Add payment notes (optional)..."
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white dark:bg-white text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-500 resize-none"
                    rows="2"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(invoice.amountPaid || 0, userCurrency)}</span>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setIsEditingPayment(true)}
                    className="flex items-center gap-1 no-print"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between w-full max-w-xs gap-4 font-semibold">
              <span>
                {balanceDue > 0 
                  ? "Balance Due" 
                  : balanceDue < 0 
                  ? "Credit Balance (Refund Due)" 
                  : "Fully Paid"}
              </span>
              <span className={
                balanceDue > 0 
                  ? "text-red-600 dark:text-red-600" 
                  : balanceDue < 0 
                  ? "text-blue-600 dark:text-blue-600" 
                  : "text-emerald-600 dark:text-emerald-600"
              }>
                {formatCurrency(Math.abs(balanceDue), userCurrency)}
              </span>
            </div>
            {/* GRA verification QR – bottom right (like GRA sample invoice) */}
            <div className="mt-4 flex flex-col items-end">
              {(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode) ? (
                String(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode).startsWith("data:image") ? (
                  <img
                    src={invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode}
                    alt="GRA Verification QR Code"
                    className="w-24 h-24 object-contain rounded-lg bg-white p-1"
                  />
                ) : /^https?:\/\//i.test(String(invoice.graVerificationUrl || invoice.graQrCode || invoice.graVerificationCode || "")) ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(invoice.graVerificationUrl || invoice.graQrCode || invoice.graVerificationCode)}`}
                    alt="GRA Verification QR Code"
                    className="w-24 h-24 object-contain rounded-lg bg-white p-1"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-white p-1 inline-flex items-center justify-center overflow-hidden">
                    <QRCode
                      value={String(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode)}
                      size={88}
                    />
                  </div>
                )
              ) : (
                <>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`GRA verification pending - Invoice ${invoice.invoiceNumber || ""}`)}`}
                    alt="GRA Verification QR (sample)"
                    className="w-24 h-24 object-contain rounded-lg bg-white p-1 opacity-80"
                    title="Sample QR – submit to GRA to show verification QR"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Sample – submit to GRA for verification QR</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment History - hidden when printing */}
        {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6 no-print">
            <h3 className="text-sm font-semibold text-black dark:text-black mb-4">Payment History</h3>
            <div className="space-y-3">
              {invoice.paymentHistory
                .slice()
                .reverse()
                .map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-50 rounded-lg border border-gray-200 dark:border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-black dark:text-black">
                          {formatCurrency(payment.amount, userCurrency)}
                        </span>
                        <span className="text-xs text-black dark:text-black">
                          {moment(payment.date).format("MMM D, YYYY h:mm A")}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-black dark:text-black mt-1">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        </div>
        
        {/* Print button at bottom - slate fill, no border */}
        <div className="flex flex-col items-center no-print mt-6 gap-3">
          <p className="text-center text-xs text-gray-500 max-w-md px-4">
            In your browser&apos;s print dialog, turn on <strong>Headers and footers</strong> so the date and page numbers appear on the printed page.
          </p>
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 !rounded-lg !border-0 !bg-slate-800 hover:!bg-slate-700 !text-white dark:!bg-slate-800 dark:hover:!bg-slate-700 dark:!text-white [&_svg]:!text-white [&_svg]:!stroke-white"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </Button>
        </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceDetail;