import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { Loader2, Printer, Edit2, Save, X, FileText } from "lucide-react";
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
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-black">Invoice Details</h1>
            <p className="text-sm text-black dark:text-black flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center gap-2">
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
                className="flex items-center gap-2 text-black dark:text-black"
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
            <h2 className="text-lg font-semibold text-black dark:text-black">Invoice</h2>
            <div className="text-sm text-black dark:text-black">#{invoice.invoiceNumber}</div>
            <div className="text-sm text-black dark:text-black">
              Date: {invoice.invoiceDate ? moment(invoice.invoiceDate).format("MMM D, YYYY") : "-"}
            </div>
            <div className="text-sm text-black dark:text-black">
              Due: {invoice.dueDate ? moment(invoice.dueDate).format("MMM D, YYYY") : "-"}
            </div>
          </div>
          <div className="text-sm">
            <span className="font-medium text-black dark:text-black">Status: </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              (invoice.status || "").toLowerCase() === "fully paid" || (invoice.status || "").toLowerCase() === "paid"
                ? "bg-emerald-100 text-emerald-800"
                : (invoice.status || "").toLowerCase() === "partially paid"
                ? "bg-sky-100 text-sky-800"
                : "bg-red-100 text-red-800"
            }`}>
              {invoice.status || "Unpaid"}
            </span>
          </div>
        </div>

        <div className="invoice-bill-from-to grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 mt-6">
          <div className="text-left">
            <h3 className="text-sm font-semibold text-black mb-2">Bill From</h3>
            <div className="text-sm text-black">
              <div>{invoice.billFrom?.businessName || user?.businessName || "-"}</div>
              <div>{invoice.billFrom?.email || user?.email || "-"}</div>
              <div>{invoice.billFrom?.address || user?.address || "-"}</div>
              <div>{invoice.billFrom?.phone || user?.phone || "-"}</div>
              <div>TIN: {invoice.billFrom?.tin || user?.tin || "-"}</div>
            </div>
          </div>
          <div className="invoice-bill-to text-left">
            <h3 className="text-sm font-semibold text-black mb-2">Bill To</h3>
            <div className="text-sm text-black">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItems.map((item, index) => (
                <tr key={index} className="hover:bg-teal-700 group transition-colors duration-150">
                  <td className="px-4 py-3 text-sm text-black group-hover:text-white">{item.sn || index + 1}</td>
                  <td className="px-4 py-3 text-sm text-black group-hover:text-white">
                    {item.description || item.itemDescription || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-black group-hover:text-white">{item.quantity || "-"}</td>
                  <td className="px-4 py-3 text-sm text-black group-hover:text-white">
                    {formatCurrency(item.unitPrice ?? item.itemPrice, userCurrency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-black group-hover:text-white">
                    {formatCurrency(item.total ?? item.amount ?? 0, userCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Left: Notes + GRA QR | Right: Subtotal & tax details - same row when printing */}
        <div className="invoice-gra-and-tax mt-6 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
          {/* Left column: Notes and GRA QR code */}
          <div className="flex flex-col gap-4">
            <div className="text-sm text-black">
              <div>Notes: {invoice.notes || "-"}</div>
              <div>Payment Terms: {invoice.paymentTerms || "-"}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-black">GRA Verification QR</div>
              {(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode) ? (
                String(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode).startsWith("data:image") ? (
                  <img
                    src={invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode}
                    alt="GRA QR"
                    className="w-32 h-32 object-contain border border-gray-200 rounded-xl bg-white p-2"
                  />
                ) : (
                  <div className="w-32 h-32 border border-gray-200 rounded-xl bg-white p-2 inline-flex items-center justify-center">
                    <QRCode value={String(invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode)} size={112} />
                  </div>
                )
              ) : (
                <div className="w-32 h-32 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center text-xs text-black">No QR</div>
              )}
            </div>
          </div>
          {/* Right column: Subtotal and tax details */}
          <div className="text-sm text-black space-y-2 flex flex-col items-end">
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
                  ? "text-red-600" 
                  : balanceDue < 0 
                  ? "text-blue-600" 
                  : "text-emerald-600"
              }>
                {formatCurrency(Math.abs(balanceDue), userCurrency)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History - hidden when printing */}
        {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6 no-print">
            <h3 className="text-sm font-semibold text-black mb-4">Payment History</h3>
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
                        <span className="font-medium text-black">
                          {formatCurrency(payment.amount, userCurrency)}
                        </span>
                        <span className="text-xs text-black">
                          {moment(payment.date).format("MMM D, YYYY h:mm A")}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-black mt-1">
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
