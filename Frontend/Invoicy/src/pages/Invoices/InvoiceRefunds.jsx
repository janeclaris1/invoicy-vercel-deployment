import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import graApi from "../../utils/graApi";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import Button from "../../components/ui/Button";

const round2 = (n) => Math.round((Number(n || 0)) * 100) / 100;
const looksLikeObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v || "").trim());
const REF_TXN_REGEX = /^PREF-\d{3}$/i; // e.g. PREF-034
const VAT_RATE = 0.15;
const NHIL_RATE = 0.025;
const GETFUND_RATE = 0.025;
const ALL_TAX_RATE = VAT_RATE + NHIL_RATE + GETFUND_RATE;
const makeTxnRef = (prefix = "PREF") => {
  const n = Math.floor(Math.random() * 1000);
  return `${prefix}-${String(n).padStart(3, "0")}`;
};

const InvoiceRefunds = () => {
  const navigate = useNavigate();
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
  const [refundReference, setRefundReference] = useState(makeTxnRef("PREF"));
  const [cancelReference, setCancelReference] = useState("");
  const [selectedRefundEventId, setSelectedRefundEventId] = useState("");
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);
  const [itemsCatalog, setItemsCatalog] = useState([]);

  useEffect(() => {
    const loadItemsCatalog = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
        setItemsCatalog(Array.isArray(res.data) ? res.data : []);
      } catch {
        setItemsCatalog([]);
      }
    };
    loadItemsCatalog();
  }, []);

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

  const skuByCatalogId = useMemo(() => {
    const m = new Map();
    for (const it of itemsCatalog) {
      const id = it?._id || it?.id;
      if (!id) continue;
      const sku = String(it.sku || "").trim();
      if (sku) m.set(String(id), sku);
    }
    return m;
  }, [itemsCatalog]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!selectedInvoiceId) {
        setSelectedInvoice(null);
        setRefundReference(makeTxnRef("PREF"));
        return;
      }
      setLoadingInvoiceDetails(true);
      try {
        const res = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(selectedInvoiceId));
        const inv = res.data || null;
        setSelectedInvoice(inv);
        setRefundReference(makeTxnRef("PREF"));
        const refundEvents = Array.isArray(inv?.refundEvents) ? inv.refundEvents : [];
        const firstOpen = refundEvents.find((e) => e && !e.cancelled);
        setSelectedRefundEventId(firstOpen?.eventId || "");
      } catch (err) {
        setSelectedInvoice(null);
        toast.error(err?.response?.data?.message || "Failed to load selected invoice.");
      } finally {
        setLoadingInvoiceDetails(false);
      }
    };
    loadInvoice();
  }, [selectedInvoiceId, skuByCatalogId]);

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

  const refundEvents = useMemo(() => {
    const events = Array.isArray(selectedInvoice?.refundEvents) ? selectedInvoice.refundEvents : [];
    return events
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
  }, [selectedInvoice]);

  const refundedInvoiceHistory = useMemo(() => {
    const rows = [];
    for (const inv of invoices) {
      const events = Array.isArray(inv?.refundEvents) ? inv.refundEvents : [];
      if (events.length === 0) continue;
      events.forEach((ev) => {
        rows.push({
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber || "-",
          customer: inv.billTo?.clientName || "Customer",
          eventId: ev.eventId || "-",
          type: ev.type || "REFUND",
          reference: ev.reference || "-",
          amount: Number(ev.amount || 0),
          status: ev.cancelled ? "Cancelled" : "Submitted",
          createdAt: ev.createdAt || null,
          cancelledAt: ev.cancelledAt || null,
          refundInvoiceNumber: ev.refundInvoiceNumber || "",
        });
      });
    }
    return rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [invoices]);

  const historySummary = useMemo(() => {
    const submitted = refundedInvoiceHistory.filter((r) => r.status === "Submitted");
    const cancelled = refundedInvoiceHistory.filter((r) => r.status === "Cancelled");
    const totalSubmitted = submitted.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return {
      refundedInvoices: new Set(refundedInvoiceHistory.map((r) => r.invoiceId)).size,
      totalEvents: refundedInvoiceHistory.length,
      submittedEvents: submitted.length,
      cancelledEvents: cancelled.length,
      totalSubmitted,
    };
  }, [refundedInvoiceHistory]);

  const exportHistoryCsv = () => {
    if (refundedInvoiceHistory.length === 0) {
      toast.error("No refund history to export.");
      return;
    }
    const headers = [
      "Invoice Number",
      "Customer",
      "Event ID",
      "Type",
      "Reference",
      "Amount",
      "Status",
      "Refund Invoice Number",
      "Created At",
      "Cancelled At",
    ];
    const lines = refundedInvoiceHistory.map((r) => [
      r.invoiceNumber,
      r.customer,
      r.eventId,
      r.type,
      r.reference,
      String(round2(r.amount)),
      r.status,
      r.refundInvoiceNumber || "",
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.cancelledAt ? new Date(r.cancelledAt).toISOString() : "",
    ]);
    const csvEscape = (value) => {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, "\"\"")}"`;
      return s;
    };
    const csv = [headers, ...lines].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHistoryJson = () => {
    if (refundedInvoiceHistory.length === 0) {
      toast.error("No refund history to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(refundedInvoiceHistory, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printRefundHistoryOnly = () => {
    if (refundedInvoiceHistory.length === 0) {
      toast.error("No refund history to export.");
      return;
    }
    const rowsHtml = refundedInvoiceHistory
      .map(
        (row) => `
          <tr>
            <td>${row.invoiceNumber}</td>
            <td>${row.customer}</td>
            <td>${row.eventId}</td>
            <td>${row.type}</td>
            <td>${row.reference}</td>
            <td>${formatCurrency(row.amount, userCurrency)}</td>
            <td>${row.status}</td>
            <td>${row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
          </tr>
        `
      )
      .join("");
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      toast.error("Unable to open print preview window.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Refunded Invoices History</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 0 0 16px; color: #555; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            @media print {
              body { padding: 0; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>Refunded Invoices History</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Event</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  };

  const handleSubmitRefundToGRA = async () => {
    if (!selectedInvoice) {
      toast.error("Select an invoice first.");
      return;
    }
    if (!selectedInvoice.invoiceNumber) {
      toast.error("Invoice number is required for refund submission.");
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
        // Keep refund itemCode aligned with invoice submission path for this tenant.
        const safeItemCode = `ITEM-${idx + 1}`;
        // Keep description format aligned with submit-invoice flow (non-empty, max 100 chars).
        const rawDescription = String(item.description || item.itemDescription || "").trim();
        const safeDescription = rawDescription.slice(0, 100);
        const lineDiscount = round2(Number(item.discountAmount || item.discount || 0) * factor);
        const lineExtended = round2(scaledQty * unitPrice);
        const taxableOrInclusive = Math.max(round2(lineExtended - lineDiscount), 0);
        let levyAmountA = 0;
        let levyAmountB = 0;
        let totalVatLine = 0;
        if (calculationType === "EXCLUSIVE") {
          levyAmountA = round2(taxableOrInclusive * NHIL_RATE);
          levyAmountB = round2(taxableOrInclusive * GETFUND_RATE);
          totalVatLine = round2(taxableOrInclusive * VAT_RATE);
        } else {
          const netBase = round2(taxableOrInclusive / (1 + ALL_TAX_RATE));
          levyAmountA = round2(netBase * NHIL_RATE);
          levyAmountB = round2(netBase * GETFUND_RATE);
          totalVatLine = round2(taxableOrInclusive - netBase - levyAmountA - levyAmountB);
          if (totalVatLine < 0) {
            totalVatLine = round2(netBase * VAT_RATE);
          }
        }

        return {
          itemCode: safeItemCode,
          itemCategory: String(item.itemCategory || ""),
          expireDate: item.expireDate ? String(item.expireDate) : "",
          description: safeDescription,
          quantity: scaledQty,
          levyAmountA,
          levyAmountB,
          levyAmountC: round2(Number(item.levyAmountC || 0) * factor),
          levyAmountD: round2(Number(item.levyAmountD || 0) * factor),
          levyAmountE: round2(Number(item.levyAmountE || 0) * factor),
          discountAmount: lineDiscount,
          exciseAmount: round2(Number(item.exciseAmount || 0) * factor),
          batchCode: String(item.batchCode || ""),
          unitPrice,
          totalVatLine,
        };
      })
      .filter((i) => i.quantity > 0 && i.description);

    const effectiveReference = String(refundReference || makeTxnRef("PREF")).trim().toUpperCase();
    if (!effectiveReference || !REF_TXN_REGEX.test(effectiveReference)) {
      setRefundReference(makeTxnRef("PREF"));
      toast.error("Reference must be a transaction ID like PREF-034 (not SKU).");
      return;
    }

    if (payloadItems.length === 0) {
      toast.error("No refundable line items found.");
      return;
    }

    const payload = {
      // Match GRA sample shape for stability in refund endpoint.
      currency: String(selectedInvoice.currency || userCurrency || "GHS"),
      exchangeRate: "1.0",
      invoiceNumber: String(selectedInvoice.invoiceNumber),
      totalLevy: round2(
        payloadItems.reduce(
          (sum, item) =>
            sum +
            Number(item.levyAmountA || 0) +
            Number(item.levyAmountB || 0) +
            Number(item.levyAmountD || 0) +
            Number(item.levyAmountE || 0),
          0
        )
      ),
      userName: String(user?.name || user?.fullName || user?.businessName || selectedInvoice.billFrom?.businessName || ""),
      flag: refundType === "FULL" ? "REFUND" : "PARTIAL_REFUND",
      calculationType,
      totalVat: round2(payloadItems.reduce((sum, item) => sum + Number(item.totalVatLine || 0), 0)),
      transactionDate: new Date().toISOString().slice(0, 10),
      totalAmount: round2(
        payloadItems.reduce((sum, item) => {
          const lineTotal = round2(Number(item.quantity || 0) * Number(item.unitPrice || 0));
          return sum + lineTotal - Number(item.discountAmount || 0) + Number(item.exciseAmount || 0);
        }, 0)
      ),
      totalExciseAmount: round2(payloadItems.reduce((sum, item) => sum + Number(item.exciseAmount || 0), 0)),
      voucherAmount: 0,
      businessPartnerTin: String(selectedInvoice.billTo?.tin || "C0000000000").trim() || "C0000000000",
      businessPartnerName: "Cash Customer",
      saleType: "NORMAL",
      discountType: "GENERAL",
      taxType: "STANDARD",
      discountAmount: round2(Number(selectedInvoice.totalDiscount || 0) * factor),
      reference: effectiveReference,
      groupReferenceId: "",
      purchaseOrderReference: "",
      items: payloadItems.map(({ totalVatLine, ...item }) => item),
    };
    if (payload.businessPartnerTin !== "C0000000000") {
      payload.businessPartnerName = String(selectedInvoice.billTo?.clientName || "").trim() || "Customer";
    }

    setRefundSubmitting(true);
    try {
      const graResult = await graApi.invoice(payload);
      const responseNode = graResult?.response || graResult?.data || graResult || {};
      const refundInvoiceNumber =
        responseNode?.num ||
        responseNode?.invoiceNumber ||
        responseNode?.message?.num ||
        "";
      const newEvent = {
        eventId: `RF-${Date.now()}`,
        type: refundType === "FULL" ? "REFUND" : "PARTIAL_REFUND",
        reference: effectiveReference.toUpperCase().slice(0, 50),
        amount: round2(Number(selectedInvoice.grandTotal || 0) * factor),
        status: "submitted",
        refundInvoiceNumber: String(refundInvoiceNumber || ""),
        request: payload,
        response: graResult,
        cancelled: false,
        createdBy: user?._id || null,
        createdAt: new Date().toISOString(),
      };
      const nextEvents = [...refundEvents, newEvent];
      await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(selectedInvoice._id), {
        refundEvents: nextEvents,
      });
      setSelectedInvoice((prev) => prev ? { ...prev, refundEvents: nextEvents } : prev);
      setSelectedRefundEventId(newEvent.eventId);
      setRefundReference(makeTxnRef("PREF"));
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
    const selectedEvent = refundEvents.find((e) => e?.eventId === selectedRefundEventId && !e.cancelled);
    if (!selectedEvent) {
      toast.error("Select a submitted refund to cancel.");
      return;
    }
    if (!String(cancelReference || "").trim()) {
      toast.error("Cancellation reference is required.");
      return;
    }

    const payload = {
      invoiceNumber: String(selectedEvent.refundInvoiceNumber || selectedInvoice.invoiceNumber),
      reference: String(cancelReference).trim().slice(0, 50),
      userName: String(user?.name || user?.fullName || user?.businessName || selectedInvoice.billFrom?.businessName || ""),
      flag: "REFUND_CANCELATION",
      transactionDate: new Date().toISOString(),
      totalAmount: round2(Number(selectedEvent.amount || selectedInvoice.grandTotal || 0)),
    };

    setCancellationSubmitting(true);
    try {
      const result = await graApi.cancellation(payload);
      const nextEvents = refundEvents.map((ev) =>
        ev?.eventId === selectedEvent.eventId
          ? {
              ...ev,
              cancelled: true,
              cancelledAt: new Date().toISOString(),
              cancellationReference: String(cancelReference).trim().slice(0, 50),
              cancellationResponse: result,
            }
          : ev
      );
      await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(selectedInvoice._id), {
        refundEvents: nextEvents,
      });
      setSelectedInvoice((prev) => prev ? { ...prev, refundEvents: nextEvents } : prev);
      const nextOpen = nextEvents.find((e) => e && !e.cancelled);
      setSelectedRefundEventId(nextOpen?.eventId || "");
      setCancelReference("");
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Invoice Refunds</h1>
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
                <label className="mb-1 block text-xs font-medium text-gray-700">Reference (transaction ID, required)</label>
                <input
                  type="text"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="Auto-generated refund transaction reference (e.g. PREF-034)"
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Use a unique refund transaction identifier (for example PREF-034).
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
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-gray-700">Select Refund Event</label>
            <select
              value={selectedRefundEventId}
              onChange={(e) => setSelectedRefundEventId(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm bg-white text-black"
            >
              <option value="">Choose submitted refund</option>
              {refundEvents
                .filter((ev) => ev && !ev.cancelled)
                .map((ev) => (
                  <option key={ev.eventId} value={ev.eventId}>
                    {ev.eventId} - {ev.type} - {formatCurrency(ev.amount || 0, userCurrency)} - Ref {ev.reference}
                  </option>
                ))}
            </select>
          </div>
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

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Refund History</h2>
        {refundEvents.length === 0 ? (
          <p className="text-sm text-slate-600">No refund events recorded for this invoice yet.</p>
        ) : (
          <div className="space-y-2">
            {refundEvents.map((ev) => (
              <div key={ev.eventId} className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{ev.eventId}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-xs">{ev.type}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${ev.cancelled ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {ev.cancelled ? "Cancelled" : "Submitted"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Amount: {formatCurrency(ev.amount || 0, userCurrency)} | Ref: {ev.reference} | Created: {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "-"}
                </div>
                {ev.cancellationReference ? (
                  <div className="mt-1 text-xs text-slate-600">
                    Cancellation Ref: {ev.cancellationReference}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Refunded Invoices History</h2>
            <p className="text-xs text-slate-600 mt-1">
              Tracks all refunded invoices and refund events across the workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportHistoryCsv}>Export CSV</Button>
            <Button variant="outline" onClick={exportHistoryJson}>Export JSON</Button>
            <Button variant="outline" onClick={printRefundHistoryOnly}>Print / PDF</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-slate-500 text-xs">Refunded invoices</p>
            <p className="font-semibold text-slate-900">{historySummary.refundedInvoices}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-slate-500 text-xs">Refund events</p>
            <p className="font-semibold text-slate-900">{historySummary.totalEvents}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-slate-500 text-xs">Submitted events</p>
            <p className="font-semibold text-emerald-700">{historySummary.submittedEvents}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-slate-500 text-xs">Submitted amount</p>
            <p className="font-semibold text-blue-700">{formatCurrency(historySummary.totalSubmitted, userCurrency)}</p>
          </div>
        </div>

        {refundedInvoiceHistory.length === 0 ? (
          <p className="text-sm text-slate-600">No refunded invoices logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refundedInvoiceHistory.map((row, idx) => (
                  <tr key={`${row.invoiceId}-${row.eventId}-${idx}`} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{row.invoiceNumber}</td>
                    <td className="py-2 pr-4">{row.customer}</td>
                    <td className="py-2 pr-4">{row.eventId}</td>
                    <td className="py-2 pr-4">{row.type}</td>
                    <td className="py-2 pr-4">{row.reference}</td>
                    <td className="py-2 pr-4">{formatCurrency(row.amount, userCurrency)}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${row.status === "Cancelled" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-blue-700 hover:text-blue-800 font-medium"
                        onClick={() => navigate(`/invoices/${row.invoiceId}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceRefunds;
