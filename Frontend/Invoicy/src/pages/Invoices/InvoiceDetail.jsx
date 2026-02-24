import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { Loader2, Printer, Edit2, Save, X, FileText, Building2 } from "lucide-react";
import QRCode from "react-qr-code";
import axiosInstance from "../../utils/axiosInstance";
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

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
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
    };
    fetchInvoice();
  }, [id]);

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
    if (!invoice || (invoice.type || "invoice") !== "proforma" || invoice.convertedTo) return;
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
    if (invType === "proforma") {
      toast.error("Submit to GRA is only available for tax invoices. Convert this proforma to an invoice first.");
      return;
    }
    if (!user?.graCredentialsConfigured) {
      toast.error("Configure GRA credentials in Settings → Company (Company Reference and Security Key) to submit to GRA.");
      return;
    }
    setGraSubmitting(true);
    try {
      const response = await axiosInstance.post(API_PATHS.GRA.SUBMIT_INVOICE, { invoiceId: id });
      const data = response?.data || response;
      const res = data?.response || data;
      const mesaage = res?.mesaage || res?.message || data?.response?.mesaage;
      // Capture verification URL from any common GRA response fields
      const qrCode =
        res?.qr_code ?? data?.qr_code ?? mesaage?.qr_code ?? res?.verificationUrl ?? data?.verificationUrl ?? mesaage?.verificationUrl;
      const verificationUrl = (typeof qrCode === "string" && qrCode.trim() && /^(https?:\/\/|data:)/i.test(qrCode.trim()))
        ? qrCode.trim()
        : (res?.verificationUrl ?? data?.verificationUrl ?? mesaage?.verificationUrl ?? null);
      const verificationCode =
        res?.verificationCode ?? data?.verificationCode ?? mesaage?.ysdcintdata ?? res?.ysdcintdata ?? data?.ysdcintdata ?? mesaage?.verificationCode;
      const updates = {};
      if (verificationUrl && String(verificationUrl).trim()) updates.graVerificationUrl = String(verificationUrl).trim();
      if (verificationCode && String(verificationCode).trim()) updates.graVerificationCode = String(verificationCode).trim();
      if (qrCode && String(qrCode).startsWith("data:image")) updates.graQrCode = qrCode;
      if (mesaage?.ysdcid) updates.graSdcId = String(mesaage.ysdcid).trim();
      if (mesaage?.ysdcrecnum) updates.graReceiptNumber = String(mesaage.ysdcrecnum).trim();
      if (mesaage?.ysdctime) updates.graReceiptDateTime = mesaage.ysdctime;
      if (mesaage?.mrc) updates.graMrc = String(mesaage.mrc).trim();
      if (mesaage?.receiptSignature || mesaage?.signature) updates.graReceiptSignature = String(mesaage.receiptSignature || mesaage.signature || "").trim();
      if (Object.keys(updates).length === 0) {
        toast.success("Invoice submitted to GRA. No verification URL/code returned; check GRA portal.");
      } else {
        await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(id), updates);
        const refresh = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(id));
        setInvoice(refresh.data);
        toast.success("Submitted to GRA and verification data saved.");
      }
    } catch (err) {
      console.error("GRA submit error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit to GRA.");
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
    return <div className="text-white">{errorMessage || "Invoice not found."}</div>;
  }

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide everything except invoice content */
          body * {
            visibility: hidden;
          }
          
          /* Show only invoice content */
          .invoice-print-container,
          .invoice-print-container * {
            visibility: visible !important;
          }
          
          /* Hide layout elements */
          aside,
          header,
          nav,
          .print\\:hidden,
          .no-print,
          button,
          .btn {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Reset page layout */
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          @page {
            margin: 0.5in;
          }
          
          /* Invoice container styling */
          .invoice-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .invoice-print-container > div {
            box-shadow: none !important;
            border: none !important;
            padding: 1rem !important;
          }
          
          /* Ensure text is black */
          .invoice-print-container,
          .invoice-print-container * {
            color: #000 !important;
            background: white !important;
          }
          
          /* Hide hover effects when printing */
          .invoice-print-container tr:hover {
            background: white !important;
          }
          
          .invoice-print-container tr:hover td {
            color: #000 !important;
          }
        }
      `}</style>
      
      <div className="space-y-6 print:p-0 bg-white">
        <div className="flex items-center justify-between print:hidden">
          <div className="invoice-detail-page-header">
            <h1 className="text-2xl font-semibold text-white dark:text-black">Invoice Details</h1>
            <p className="invoice-detail-subheading text-sm text-white dark:text-black flex items-center gap-2 flex-wrap">
              #{invoice.invoiceNumber}
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${(invoice.type || "invoice") === "proforma" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                {(invoice.type || "invoice") === "proforma" ? "Proforma" : "Invoice"}
              </span>
              {invoice.convertedTo && (
                <Button size="small" variant="ghost" onClick={() => navigate(`/invoices/${invoice.convertedTo?._id || invoice.convertedTo}`)} className="text-xs">
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
                className="flex items-center gap-2 text-white dark:text-black"
              >
                {graSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                Submit to GRA
              </Button>
            )}
            {(invoice.type || "invoice") === "proforma" && !invoice.convertedTo && (invoice.status === "Fully Paid" || invoice.status === "Paid") && (
              <Button variant="secondary" onClick={handleConvertToInvoice} disabled={convertLoading} className="flex items-center gap-2">
                {convertLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Convert to invoice
              </Button>
            )}
            {!isEditingPayment ? (
              <Button 
                variant="secondary" 
                onClick={() => setIsEditingPayment(true)} 
                className="flex items-center gap-2 text-white dark:text-black"
              >
                <Edit2 className="w-4 h-4" />
                Edit Payment
              </Button>
            ) : null}
          </div>
        </div>

        <div className="invoice-print-container bg-white dark:bg-white border border-gray-200 dark:border-gray-200 rounded-xl p-6 print:border-0 print:shadow-none shadow-sm">
          {/* Logo centered at top */}
        {((invoice.companyLogo && invoice.companyLogo.trim() !== "") || (user?.companyLogo && user.companyLogo.trim() !== "")) && (
          <div className="invoice-logo-wrap flex justify-center mb-6">
              <img
                src={invoice.companyLogo && invoice.companyLogo.trim() !== "" ? invoice.companyLogo : (user?.companyLogo || "")}
                alt="Company logo"
                className="h-16 w-auto object-contain border border-gray-200 rounded-xl bg-white p-2 invoice-print-logo"
              />
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white dark:text-black">Invoice</h2>
            <div className="text-sm text-white dark:text-black">#{invoice.invoiceNumber}</div>
            <div className="text-sm text-white dark:text-black">
              Date: {invoice.invoiceDate ? moment(invoice.invoiceDate).format("MMM D, YYYY") : "-"}
            </div>
            <div className="text-sm text-white dark:text-black">
              Due: {invoice.dueDate ? moment(invoice.dueDate).format("MMM D, YYYY") : "-"}
            </div>
          </div>
          <div className="text-sm">
            <span className="font-medium text-white dark:text-black">Status: </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              (invoice.status || "").toLowerCase() === "fully paid" || (invoice.status || "").toLowerCase() === "paid"
                ? "bg-emerald-100 text-emerald-800"
                : (invoice.status || "").toLowerCase() === "partially paid"
                ? "bg-[#B8860B] text-white"
                : "bg-red-100 text-red-800"
            }`}>
              {invoice.status || "Unpaid"}
            </span>
          </div>
        </div>

        <div className="invoice-bill-from-to grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 mt-6">
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white dark:text-black mb-2">Bill From</h3>
            <div className="text-sm text-white dark:text-black">
              <div>{invoice.billFrom?.businessName || user?.businessName || "-"}</div>
              <div>{invoice.billFrom?.email || user?.email || "-"}</div>
              <div>{invoice.billFrom?.address || user?.address || "-"}</div>
              <div>{invoice.billFrom?.phone || user?.phone || "-"}</div>
              <div>TIN: {invoice.billFrom?.tin || user?.tin || "-"}</div>
            </div>
          </div>
          <div className="invoice-bill-to text-left">
            <h3 className="text-sm font-semibold text-white dark:text-black mb-2">Bill To</h3>
            <div className="text-sm text-white dark:text-black">
              <div>{invoice.billTo?.clientName || "-"}</div>
              <div>{invoice.billTo?.email || "-"}</div>
              <div>{invoice.billTo?.address || "-"}</div>
              <div>{invoice.billTo?.phone || "-"}</div>
              <div>TIN: {invoice.billTo?.tin || "-"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white dark:text-black uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white dark:text-black uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white dark:text-black uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white dark:text-black uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white dark:text-black uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItems.map((item, index) => (
                <tr key={index} className="hover:bg-teal-700 group transition-colors duration-150">
                  <td className="px-4 py-3 text-sm text-white dark:text-black group-hover:text-white">{item.sn || index + 1}</td>
                  <td className="px-4 py-3 text-sm text-white dark:text-black group-hover:text-white">
                    {item.description || item.itemDescription || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-white dark:text-black group-hover:text-white">{item.quantity || "-"}</td>
                  <td className="px-4 py-3 text-sm text-white dark:text-black group-hover:text-white">
                    {formatCurrency(item.unitPrice ?? item.itemPrice, userCurrency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white dark:text-black group-hover:text-white">
                    {formatCurrency(item.total ?? item.amount ?? 0, userCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Left: Notes | Right: Tax summary + QR */}
        <div className="invoice-gra-and-tax mt-6 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 bg-slate-800 dark:bg-transparent text-white dark:text-black rounded-xl p-4 dark:p-0">
          {/* Left column: Notes */}
          <div className="flex flex-col gap-4">
            <div className="text-sm">
              <div>Notes: {invoice.notes || "-"}</div>
              <div>Payment Terms: {invoice.paymentTerms || "-"}</div>
            </div>
            {invoice.graVerificationUrl && /^https?:\/\//i.test(invoice.graVerificationUrl) && (
              <a href={invoice.graVerificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-90 hover:opacity-100">
                Verify on GRA portal →
              </a>
            )}
          </div>
          {/* Right column: Subtotal, tax details, and GRA QR (bottom right like GRA sample) */}
          <div className="text-sm space-y-2 flex flex-col items-end">
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
                <div className="flex flex-col items-end gap-2 w-full max-w-md">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white text-black"
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
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white text-black resize-none"
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
                  ? "text-red-200 dark:text-red-600" 
                  : balanceDue < 0 
                  ? "text-blue-200 dark:text-blue-600" 
                  : "text-emerald-200 dark:text-emerald-600"
              }>
                {formatCurrency(Math.abs(balanceDue), userCurrency)}
              </span>
            </div>
            {/* GRA verification QR – bottom right (like GRA sample invoice) */}
            <div className="mt-4 flex flex-col items-end">
              <div className="text-xs font-medium opacity-90 mb-1">GRA Verification QR</div>
              {(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode) ? (
                String(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode).startsWith("data:image") ? (
                  <img
                    src={invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode}
                    alt="GRA Verification QR Code"
                    className="w-36 h-36 object-contain border border-slate-600 dark:border-slate-500 rounded-lg bg-white p-2"
                  />
                ) : /^https?:\/\//i.test(String(invoice.graVerificationUrl || invoice.graQrCode || invoice.graVerificationCode || "")) ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(invoice.graVerificationUrl || invoice.graQrCode || invoice.graVerificationCode)}`}
                    alt="GRA Verification QR Code"
                    className="w-36 h-36 object-contain border border-slate-600 dark:border-slate-500 rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="w-36 h-36 border border-slate-600 dark:border-slate-500 rounded-lg bg-white p-2 inline-flex items-center justify-center overflow-hidden">
                    <QRCode
                      value={String(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode)}
                      size={128}
                      style={{ height: 128, width: 128 }}
                    />
                  </div>
                )
              ) : (
                <>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(`GRA verification pending - Invoice ${invoice.invoiceNumber || ""}`)}`}
                    alt="GRA Verification QR (sample)"
                    className="w-36 h-36 object-contain border border-slate-600 dark:border-slate-500 rounded-lg bg-white p-2 opacity-80"
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
            <h3 className="text-sm font-semibold text-white dark:text-black mb-4">Payment History</h3>
            <div className="space-y-3">
              {invoice.paymentHistory
                .slice()
                .reverse()
                .map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-white dark:text-black">
                          {formatCurrency(payment.amount, userCurrency)}
                        </span>
                        <span className="text-xs text-white dark:text-black">
                          {moment(payment.date).format("MMM D, YYYY h:mm A")}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-white dark:text-black mt-1">
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
        
        {/* Print button at bottom - white text, white border, no blue */}
        <div className="flex justify-center no-print mt-6">
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 !rounded-lg !bg-slate-800 hover:!bg-slate-700 !text-white !border-2 !border-white dark:!bg-slate-800 dark:hover:!bg-slate-700 dark:!text-white dark:!border-white [&_svg]:!text-white [&_svg]:!stroke-white"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </Button>
        </div>
      </div>
    </>
  );
};

export default InvoiceDetail;
