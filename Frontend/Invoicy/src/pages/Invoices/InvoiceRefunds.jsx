import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import graApi from "../../utils/graApi";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import Button from "../../components/ui/Button";

const round2 = (n) => Math.round((Number(n || 0)) * 100) / 100;

const InvoiceRefunds = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundType, setRefundType] = useState("FULL");
  const [partialRefundPercent, setPartialRefundPercent] = useState("50");
  const [refundReference, setRefundReference] = useState("");
  const [cancelReference, setCancelReference] = useState("");
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);

  useEffect(() => {
    const loadInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const res = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL_INVOICES);
        const list = Array.isArray(res.data) ? res.data : [];
        const taxInvoices = list.filter((inv) => (inv.type || "invoice").toLowerCase() === "invoice");
        setInvoices(taxInvoices);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load invoices.");
      } finally {
        setLoadingInvoices(false);
      }
    };
    loadInvoices();
  }, []);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!selectedInvoiceId) {
        setSelectedInvoice(null);
        setRefundReference("");
        return;
      }
      setLoadingInvoiceDetails(true);
      try {
        const res = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(selectedInvoiceId));
        const inv = res.data || null;
        setSelectedInvoice(inv);
        const suggestedReference = String(inv?.graReceiptNumber || "").trim();
        setRefundReference((prev) => (String(prev || "").trim() ? prev : suggestedReference));
      } catch (err) {
        setSelectedInvoice(null);
        toast.error(err?.response?.data?.message || "Failed to load selected invoice.");
      } finally {
        setLoadingInvoiceDetails(false);
      }
    };
    loadInvoice();
  }, [selectedInvoiceId]);

  const lineItems = useMemo(() => {
    if (!selectedInvoice) return [];
    if (Array.isArray(selectedInvoice.item) && selectedInvoice.item.length > 0) return selectedInvoice.item;
    if (Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0) return selectedInvoice.items;
    return [];
  }, [selectedInvoice]);

  const refundFactor = useMemo(() => {
    if (refundType === "FULL") return 1;
    const raw = parseFloat(String(partialRefundPercent || "").replace(",", "."));
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(100, raw)) / 100;
  }, [refundType, partialRefundPercent]);

  const refundPreviewAmount = useMemo(() => {
    if (!selectedInvoice) return 0;
    return round2(Number(selectedInvoice.grandTotal || 0) * refundFactor);
  }, [selectedInvoice, refundFactor]);

  const handleSubmitRefundToGRA = async () => {
    if (!selectedInvoice) {
      toast.error("Select an invoice first.");
      return;
    }
    if (!selectedInvoice.invoiceNumber) {
      toast.error("Invoice number is required for refund submission.");
      return;
    }
    const graReceiptReference = String(selectedInvoice.graReceiptNumber || "").trim();
    if (!graReceiptReference) {
      toast.error("This invoice has no GRA receipt reference. Submit the invoice to GRA first, then refund.");
      return;
    }
    const effectiveReference = String(refundReference || graReceiptReference).trim();
    if (!effectiveReference || effectiveReference !== graReceiptReference) {
      toast.error("Reference must match the original GRA receipt number for this invoice.");
      return;
    }
    if (refundType === "PARTIAL" && refundFactor <= 0) {
      toast.error("Enter a partial refund percentage greater than 0.");
      return;
    }

    const calculationType = String(selectedInvoice.vatScenario || user?.graVatScenario || "inclusive").toUpperCase() === "EXCLUSIVE"
      ? "EXCLUSIVE"
      : "INCLUSIVE";
    const leviesTotal = Number(selectedInvoice.totalNhil || 0) + Number(selectedInvoice.totalGetFund || 0);
    const factor = refundType === "FULL" ? 1 : refundFactor;

    const payloadItems = lineItems
      .map((item, idx) => {
        const qty = Number(item.quantity) || 0;
        const scaledQty = round2(qty * factor);
        const unitPrice = round2(Number(item.unitPrice ?? item.itemPrice ?? 0));
        return {
          itemCode: String(item.itemCode || item.catalogId || item.itemId || `ITEM-${idx + 1}`),
          itemCategory: String(item.itemCategory || ""),
          expireDate: item.expireDate ? String(item.expireDate) : "",
          description: String(item.description || item.itemDescription || `Item ${idx + 1}`),
          quantity: scaledQty,
          levyAmountA: round2(Number(item.levyAmountA || 0) * factor),
          levyAmountB: round2(Number(item.levyAmountB || 0) * factor),
          levyAmountC: round2(Number(item.levyAmountC || 0) * factor),
          levyAmountD: round2(Number(item.levyAmountD || 0) * factor),
          levyAmountE: round2(Number(item.levyAmountE || 0) * factor),
          discountAmount: round2(Number(item.discountAmount || 0) * factor),
          exciseAmount: round2(Number(item.exciseAmount || 0) * factor),
          batchCode: String(item.batchCode || ""),
          unitPrice,
        };
      })
      .filter((i) => i.quantity > 0);

    if (payloadItems.length === 0) {
      toast.error("No refundable line items found.");
      return;
    }

    const payload = {
      currency: String(selectedInvoice.currency || userCurrency || "GHS"),
      exchangeRate: Number(selectedInvoice.exchangeRate || 1),
      invoiceNumber: String(selectedInvoice.invoiceNumber),
      totalLevy: round2(leviesTotal * factor),
      userName: String(user?.name || user?.fullName || user?.businessName || selectedInvoice.billFrom?.businessName || ""),
      flag: refundType === "FULL" ? "REFUND" : "PARTIAL_REFUND",
      calculationType,
      totalVat: round2(Number(selectedInvoice.totalVat || 0) * factor),
      transactionDate: new Date().toISOString(),
      totalAmount: round2(Number(selectedInvoice.grandTotal || 0) * factor),
      totalExciseAmount: 0,
      voucherAmount: 0,
      businessPartnerName: String(selectedInvoice.billTo?.clientName || "Cash Customer"),
      businessPartnerTin: String(selectedInvoice.billTo?.tin || "C0000000000"),
      saleType: "NORMAL",
      discountType: "GENERAL",
      taxType: "STANDARD",
      discountAmount: round2(Number(selectedInvoice.totalDiscount || 0) * factor),
      reference: effectiveReference.slice(0, 50),
      groupReferenceId: "",
      purchaseOrderReference: "",
      items: payloadItems,
    };

    setRefundSubmitting(true);
    try {
      await graApi.invoice(payload);
      toast.success(`${refundType === "FULL" ? "Full" : "Partial"} refund submitted to GRA.`);
    } catch (err) {
      const res = err?.response?.data;
      let msg =
        res?.message ||
        (err?.response?.status === 502 ? "GRA could not process the refund. Check payload and credentials." : null) ||
        err?.message ||
        "Failed to submit refund to GRA.";
      if (res?.graStatus != null) msg += ` (GRA status: ${res.graStatus})`;
      toast.error(msg);
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleSubmitRefundCancellation = async () => {
    if (!selectedInvoice) {
      toast.error("Select an invoice first.");
      return;
    }
    if (!selectedInvoice.invoiceNumber) {
      toast.error("Invoice number is required for cancellation.");
      return;
    }
    if (!String(cancelReference || "").trim()) {
      toast.error("Cancellation reference is required.");
      return;
    }

    const payload = {
      invoiceNumber: String(selectedInvoice.invoiceNumber),
      reference: String(cancelReference).trim().slice(0, 50),
      userName: String(user?.name || user?.fullName || user?.businessName || selectedInvoice.billFrom?.businessName || ""),
      flag: "REFUND_CANCELATION",
      transactionDate: new Date().toISOString(),
      totalAmount: round2(Number(selectedInvoice.grandTotal || 0)),
    };

    setCancellationSubmitting(true);
    try {
      await graApi.cancellation(payload);
      toast.success("Refund cancellation submitted to GRA.");
    } catch (err) {
      const res = err?.response?.data;
      let msg =
        res?.message ||
        (err?.response?.status === 502 ? "GRA could not process the refund cancellation. Check payload and credentials." : null) ||
        err?.message ||
        "Failed to submit refund cancellation to GRA.";
      if (res?.graStatus != null) msg += ` (GRA status: ${res.graStatus})`;
      toast.error(msg);
    } finally {
      setCancellationSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoice Refunds</h1>
        <p className="text-sm text-slate-600 mt-1">Submit full or partial invoice refunds to GRA.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Select Invoice</label>
          <select
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
            disabled={loadingInvoices}
          >
            <option value="">{loadingInvoices ? "Loading invoices..." : "Choose an invoice"}</option>
            {invoices.map((inv) => (
              <option key={inv._id} value={inv._id}>
                {inv.invoiceNumber} - {inv.billTo?.clientName || "Customer"} ({formatCurrency(inv.grandTotal || 0, userCurrency)})
              </option>
            ))}
          </select>
        </div>

        {loadingInvoiceDetails && (
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading invoice details...
          </div>
        )}

        {selectedInvoice && !loadingInvoiceDetails && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-700">Refund Type</label>
                <select
                  value={refundType}
                  onChange={(e) => setRefundType(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
                >
                  <option value="FULL">Full Refund</option>
                  <option value="PARTIAL">Partial Refund</option>
                </select>
              </div>
              {refundType === "PARTIAL" && (
                <div className="md:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Partial %</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={partialRefundPercent}
                    onChange={(e) => {
                      const v = e.target.value.replace(",", ".");
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setPartialRefundPercent(v);
                    }}
                    placeholder="e.g. 25"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Reference (required)</label>
                <input
                  type="text"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="Auto-filled from GRA receipt number"
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Must match the original GRA receipt number for this invoice.
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-700">
              Refund preview: <span className="font-semibold">{formatCurrency(refundPreviewAmount, userCurrency)}</span>
            </div>

            <div>
              <Button onClick={handleSubmitRefundToGRA} disabled={refundSubmitting} className="flex items-center gap-2">
                {refundSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                Submit Refund to GRA
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Refund Cancellation</h2>
          <p className="text-xs text-slate-600 mt-1">
            Reverse a previously issued refund transaction.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Cancellation Reference</label>
            <input
              type="text"
              value={cancelReference}
              onChange={(e) => setCancelReference(e.target.value)}
              placeholder="e.g. RF230724-X00002"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button
              onClick={handleSubmitRefundCancellation}
              disabled={cancellationSubmitting}
              className="w-full flex items-center justify-center gap-2"
            >
              {cancellationSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Submit Cancellation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceRefunds;
