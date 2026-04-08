import { useMemo, useState } from "react";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import graApi from "../../utils/graApi";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import { formatCurrency } from "../../utils/helper";

const round2 = (n) => Math.round((Number(n || 0)) * 100) / 100;

const emptyItem = () => ({
  itemCode: "",
  itemCategory: "",
  expireDate: "",
  description: "",
  quantity: "1",
  levyAmountA: "0",
  levyAmountB: "0",
  levyAmountD: "0",
  levyAmountE: "0",
  discountAmount: "0",
  exciseAmount: "0",
  batchCode: "",
  unitPrice: "0",
});

const InvoicePurchases = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [purchaseEvents, setPurchaseEvents] = useState([]);
  const [selectedReturnEventId, setSelectedReturnEventId] = useState("");
  const [returnCancelReference, setReturnCancelReference] = useState("");
  const [form, setForm] = useState({
    transactionType: "PURCHASE",
    currency: userCurrency,
    exchangeRate: "1.0",
    invoiceNumber: "",
    userName: user?.name || user?.fullName || user?.businessName || "",
    calculationType: "EXCLUSIVE",
    transactionDate: new Date().toISOString().slice(0, 10),
    totalExciseAmount: "0",
    businessPartnerName: "",
    businessPartnerTin: "C0000000000",
    saleType: "NORMAL",
    discountType: "GENERAL",
    taxType: "STANDARD",
    reference: "",
    groupReferenceId: "",
    purchaseOrderReference: "",
    items: [emptyItem()],
  });

  const computed = useMemo(() => {
    const toNum = (v) => Number(String(v || "").replace(",", ".")) || 0;
    const itemRows = form.items.map((it) => {
      const quantity = toNum(it.quantity);
      const unitPrice = toNum(it.unitPrice);
      const levyAmountA = toNum(it.levyAmountA);
      const levyAmountB = toNum(it.levyAmountB);
      const levyAmountD = toNum(it.levyAmountD);
      const levyAmountE = toNum(it.levyAmountE);
      const discountAmount = toNum(it.discountAmount);
      const exciseAmount = toNum(it.exciseAmount);
      const lineBase = round2(quantity * unitPrice);
      return {
        quantity,
        unitPrice,
        levyAmountA,
        levyAmountB,
        levyAmountD,
        levyAmountE,
        discountAmount,
        exciseAmount,
        lineBase,
      };
    });
    const totalLevy = round2(itemRows.reduce((s, r) => s + r.levyAmountA + r.levyAmountB + r.levyAmountD + r.levyAmountE, 0));
    const totalAmount = round2(itemRows.reduce((s, r) => s + r.lineBase - r.discountAmount + r.exciseAmount, 0));
    const totalVat = round2(itemRows.reduce((s, r) => s + (form.calculationType === "EXCLUSIVE" ? round2(r.lineBase * 0.15) : 0), 0));
    return { totalLevy, totalAmount, totalVat };
  }, [form.items, form.calculationType]);

  const updateItem = (idx, key, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...prev, items };
    });
  };

  const handleSubmitPurchase = async () => {
    if (!form.invoiceNumber.trim()) {
      toast.error("Invoice number is required.");
      return;
    }
    if (!form.businessPartnerName.trim()) {
      toast.error("Business partner name is required.");
      return;
    }
    if (!form.userName.trim()) {
      toast.error("User name is required.");
      return;
    }
    const validItems = form.items.filter((it) => String(it.description || "").trim() && String(it.itemCode || "").trim());
    if (validItems.length === 0) {
      toast.error("Add at least one item with item code and description.");
      return;
    }

    const payload = {
      currency: String(form.currency || "GHS"),
      exchangeRate: Number(form.exchangeRate || 1),
      invoiceNumber: String(form.invoiceNumber).trim(),
      totalLevy: computed.totalLevy,
      userName: String(form.userName).trim(),
      flag: form.transactionType === "PURCHASE_RETURN" ? "PURCHASE_RETURN" : "PURCHASE",
      calculationType: String(form.calculationType || "EXCLUSIVE").toUpperCase(),
      totalVat: computed.totalVat,
      transactionDate: new Date(form.transactionDate || new Date().toISOString()).toISOString(),
      totalAmount: computed.totalAmount,
      totalExciseAmount: Number(form.totalExciseAmount || 0),
      businessPartnerName: String(form.businessPartnerName).trim(),
      businessPartnerTin: String(form.businessPartnerTin || "C0000000000").trim(),
      saleType: String(form.saleType || "NORMAL"),
      discountType: String(form.discountType || "GENERAL"),
      taxType: String(form.taxType || "STANDARD"),
      discountAmount: round2(validItems.reduce((s, it) => s + (Number(it.discountAmount || 0) || 0), 0)),
      reference: String(form.reference || "").trim(),
      groupReferenceId: String(form.groupReferenceId || "").trim(),
      purchaseOrderReference: String(form.purchaseOrderReference || "").trim(),
      items: validItems.map((it) => ({
        itemCode: String(it.itemCode).trim(),
        itemCategory: String(it.itemCategory || "").trim(),
        expireDate: String(it.expireDate || "").trim(),
        description: String(it.description).trim().slice(0, 100),
        quantity: String(it.quantity || "0"),
        levyAmountA: Number(it.levyAmountA || 0),
        levyAmountB: Number(it.levyAmountB || 0),
        levyAmountD: Number(it.levyAmountD || 0),
        levyAmountE: Number(it.levyAmountE || 0),
        discountAmount: Number(it.discountAmount || 0),
        exciseAmount: Number(it.exciseAmount || 0),
        batchCode: String(it.batchCode || "").trim(),
        unitPrice: String(it.unitPrice || "0"),
      })),
    };

    setSubmitting(true);
    try {
      const res = await graApi.invoice(payload);
      const responseNode = res?.response || res?.data || res || {};
      const submittedInvoiceNumber =
        responseNode?.num || responseNode?.invoiceNumber || responseNode?.message?.num || payload.invoiceNumber;
      const eventId = `PR-${Date.now()}`;
      setPurchaseEvents((prev) => [
        {
          eventId,
          type: payload.flag,
          amount: payload.totalAmount,
          invoiceNumber: String(submittedInvoiceNumber || ""),
          reference: payload.reference || "",
          createdAt: new Date().toISOString(),
          cancelled: false,
        },
        ...prev,
      ]);
      if (payload.flag === "PURCHASE_RETURN") setSelectedReturnEventId(eventId);
      toast.success(`${payload.flag === "PURCHASE_RETURN" ? "Purchase return" : "Purchase"} submitted to GRA.`);
    } catch (err) {
      const res = err?.response?.data;
      let msg =
        res?.message ||
        (err?.response?.status === 502 ? "GRA could not process purchase. Check payload and credentials." : null) ||
        err?.message ||
        `Failed to submit ${form.transactionType === "PURCHASE_RETURN" ? "purchase return" : "purchase"}.`;
      if (res?.graStatus != null) msg += ` (GRA status: ${res.graStatus})`;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPurchaseReturnCancellation = async () => {
    const selected = purchaseEvents.find((e) => e.eventId === selectedReturnEventId && e.type === "PURCHASE_RETURN" && !e.cancelled);
    if (!selected) {
      toast.error("Select a submitted purchase return to cancel.");
      return;
    }
    if (!String(returnCancelReference || "").trim()) {
      toast.error("Cancellation reference is required.");
      return;
    }

    const payload = {
      invoiceNumber: String(selected.invoiceNumber || form.invoiceNumber || "").trim(),
      reference: String(returnCancelReference).trim().slice(0, 50),
      userName: String(form.userName || user?.name || user?.fullName || user?.businessName || "").trim(),
      flag: "PURCHASE_RETURN_CANCELATION",
      transactionDate: new Date().toISOString(),
      totalAmount: round2(Number(selected.amount || 0)),
    };

    setCancelling(true);
    try {
      await graApi.cancellation(payload);
      setPurchaseEvents((prev) =>
        prev.map((e) =>
          e.eventId === selected.eventId
            ? { ...e, cancelled: true, cancellationReference: payload.reference, cancelledAt: new Date().toISOString() }
            : e
        )
      );
      setReturnCancelReference("");
      const nextOpen = purchaseEvents.find((e) => e.eventId !== selected.eventId && e.type === "PURCHASE_RETURN" && !e.cancelled);
      setSelectedReturnEventId(nextOpen?.eventId || "");
      toast.success("Purchase return cancellation submitted to GRA.");
    } catch (err) {
      const res = err?.response?.data;
      let msg =
        res?.message ||
        (err?.response?.status === 502 ? "GRA could not process purchase return cancellation. Check payload and credentials." : null) ||
        err?.message ||
        "Failed to submit purchase return cancellation.";
      if (res?.graStatus != null) msg += ` (GRA status: ${res.graStatus})`;
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchases</h1>
        <p className="text-sm text-slate-600 mt-1">Record PURCHASE and PURCHASE_RETURN transactions for GRA.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="h-10 rounded-lg border border-gray-300 px-3 text-sm" value={form.transactionType} onChange={(e) => setForm((p) => ({ ...p, transactionType: e.target.value }))}>
            <option value="PURCHASE">PURCHASE</option>
            <option value="PURCHASE_RETURN">PURCHASE_RETURN</option>
          </select>
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="Invoice Number" value={form.invoiceNumber} onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))} />
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="User Name" value={form.userName} onChange={(e) => setForm((p) => ({ ...p, userName: e.target.value }))} />
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="Business Partner Name" value={form.businessPartnerName} onChange={(e) => setForm((p) => ({ ...p, businessPartnerName: e.target.value }))} />
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="Business Partner TIN" value={form.businessPartnerTin} onChange={(e) => setForm((p) => ({ ...p, businessPartnerTin: e.target.value }))} />
          <select className="h-10 rounded-lg border border-gray-300 px-3 text-sm" value={form.calculationType} onChange={(e) => setForm((p) => ({ ...p, calculationType: e.target.value }))}>
            <option value="EXCLUSIVE">EXCLUSIVE</option>
            <option value="INCLUSIVE">INCLUSIVE</option>
          </select>
          <input type="date" className="h-10 rounded-lg border border-gray-300 px-3 text-sm" value={form.transactionDate} onChange={(e) => setForm((p) => ({ ...p, transactionDate: e.target.value }))} />
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="Reference (optional)" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="Group Reference ID" value={form.groupReferenceId} onChange={(e) => setForm((p) => ({ ...p, groupReferenceId: e.target.value }))} />
          <input className="h-10 rounded-lg border border-gray-300 px-3 text-sm" placeholder="Purchase Order Reference" value={form.purchaseOrderReference} onChange={(e) => setForm((p) => ({ ...p, purchaseOrderReference: e.target.value }))} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Items</h2>
          <Button type="button" variant="secondary" onClick={() => setForm((p) => ({ ...p, items: [...p.items, emptyItem()] }))} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {form.items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 p-3 grid grid-cols-1 md:grid-cols-6 gap-2">
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Item Code" value={it.itemCode} onChange={(e) => updateItem(idx, "itemCode", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Quantity" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Unit Price" value={it.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Levy A" value={it.levyAmountA} onChange={(e) => updateItem(idx, "levyAmountA", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Levy B" value={it.levyAmountB} onChange={(e) => updateItem(idx, "levyAmountB", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Levy D" value={it.levyAmountD} onChange={(e) => updateItem(idx, "levyAmountD", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Levy E" value={it.levyAmountE} onChange={(e) => updateItem(idx, "levyAmountE", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Discount Amount" value={it.discountAmount} onChange={(e) => updateItem(idx, "discountAmount", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Excise Amount" value={it.exciseAmount} onChange={(e) => updateItem(idx, "exciseAmount", e.target.value)} />
              <input className="h-9 rounded border border-gray-300 px-2 text-sm" placeholder="Batch Code" value={it.batchCode} onChange={(e) => updateItem(idx, "batchCode", e.target.value)} />
              <div className="flex items-center justify-end">
                <button type="button" className="inline-flex items-center justify-center h-9 w-9 rounded border border-red-200 text-red-600" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} disabled={form.items.length <= 1}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-700 space-y-1">
          <div>Total Levy: <span className="font-semibold">{formatCurrency(computed.totalLevy, userCurrency)}</span></div>
          <div>Total VAT: <span className="font-semibold">{formatCurrency(computed.totalVat, userCurrency)}</span></div>
          <div>Total Amount: <span className="font-semibold">{formatCurrency(computed.totalAmount, userCurrency)}</span></div>
        </div>
        <div className="mt-3">
          <Button onClick={handleSubmitPurchase} disabled={submitting} className="flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
            Submit {form.transactionType === "PURCHASE_RETURN" ? "Purchase Return" : "Purchase"} to GRA
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Purchase Return Cancellation</h2>
          <p className="text-xs text-slate-600 mt-1">Cancel a previously submitted purchase return.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm md:col-span-2"
            value={selectedReturnEventId}
            onChange={(e) => setSelectedReturnEventId(e.target.value)}
          >
            <option value="">Select purchase return event</option>
            {purchaseEvents
              .filter((e) => e.type === "PURCHASE_RETURN" && !e.cancelled)
              .map((e) => (
                <option key={e.eventId} value={e.eventId}>
                  {e.eventId} - {e.invoiceNumber} - {formatCurrency(e.amount || 0, userCurrency)}
                </option>
              ))}
          </select>
          <input
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            placeholder="Cancellation reference (e.g. PR-0003)"
            value={returnCancelReference}
            onChange={(e) => setReturnCancelReference(e.target.value)}
          />
        </div>
        <Button onClick={handleSubmitPurchaseReturnCancellation} disabled={cancelling} className="flex items-center gap-2">
          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          Submit Purchase Return Cancellation
        </Button>
      </div>
    </div>
  );
};

export default InvoicePurchases;
