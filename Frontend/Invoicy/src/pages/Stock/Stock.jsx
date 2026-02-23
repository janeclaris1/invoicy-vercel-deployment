import React, { useEffect, useState, useRef } from "react";
import {
  Boxes,
  Search,
  Plus,
  Minus,
  Edit3,
  History,
  Loader2,
  AlertTriangle,
  X,
  FileText,
  Printer,
  Share2,
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import toast from "react-hot-toast";
import moment from "moment";

const Stock = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("tracked"); // "all" | "tracked" | "low"
  const [adjustModal, setAdjustModal] = useState(null); // { item }
  const [historyModal, setHistoryModal] = useState(null); // { item }
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    type: "in",
    quantity: "",
    reason: "",
    reference: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [reportFrom, setReportFrom] = useState(moment().subtract(30, "days").format("YYYY-MM-DD"));
  const [reportTo, setReportTo] = useState(moment().format("YYYY-MM-DD"));
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const reportPrintRef = useRef(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchSearch =
      !searchTerm ||
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "all") return true;
    if (!item.trackStock) return filter === "tracked" ? false : false;
    if (filter === "tracked") return true;
    if (filter === "low")
      return (
        item.reorderLevel > 0 && item.quantityInStock <= item.reorderLevel
      );
    return true;
  });

  const openAdjust = (item) => {
    setAdjustModal(item);
    setAdjustForm({ type: "in", quantity: "", reason: "", reference: "" });
  };

  const openHistory = async (item) => {
    setHistoryModal(item);
    setMovements([]);
    setMovementsLoading(true);
    try {
      const res = await axiosInstance.get(API_PATHS.ITEMS.MOVEMENTS(item._id));
      setMovements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Failed to load history");
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal) return;
    const qty = Number(adjustForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid positive quantity");
      return;
    }
    if (adjustForm.type === "adjustment" && qty < 0) {
      toast.error("Adjustment quantity must be the new stock level (positive)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axiosInstance.post(
        API_PATHS.ITEMS.ADJUST_STOCK(adjustModal._id),
        {
          type: adjustForm.type,
          quantity: adjustForm.type === "adjustment" ? qty : qty,
          reason: adjustForm.reason.trim() || undefined,
          reference: adjustForm.reference.trim() || undefined,
        }
      );
      setItems((prev) =>
        prev.map((i) => (i._id === adjustModal._id ? res.data : i))
      );
      toast.success("Stock updated");
      setAdjustModal(null);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to adjust stock"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLowStock = (item) =>
    item.trackStock &&
    item.reorderLevel > 0 &&
    item.quantityInStock <= item.reorderLevel;

  const fetchReport = async () => {
    setReportLoading(true);
    setReportData(null);
    try {
      const res = await axiosInstance.get(API_PATHS.ITEMS.STOCK_REPORT, {
        params: { from: reportFrom, to: reportTo },
      });
      setReportData(res.data);
      setReportOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (!reportPrintRef.current) return;
    const content = reportPrintRef.current;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Stock Report</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 1.5rem; margin-bottom: 8px; }
        .meta { color: #666; margin-bottom: 24px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; }
        .movements { margin-top: 32px; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleShareReport = () => {
    const url = `${window.location.origin}${window.location.pathname}?reportFrom=${reportFrom}&reportTo=${reportTo}`;
    navigator.clipboard.writeText(url);
    toast.success("Report link copied to clipboard. Share it with someone who has access.");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("reportFrom");
    const to = params.get("reportTo");
    if (from && to) {
      setReportFrom(from);
      setReportTo(to);
    }
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Boxes className="w-8 h-8 text-blue-700 dark:text-blue-400" />
            Stock Management
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            View quantities, adjust stock (in/out/adjustment), and see movement history. Enable “Track stock” on an item in Items to manage it here.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {["tracked", "low", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f
                  ? "bg-blue-900 text-white"
                  : "bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500"
              }`}
            >
              {f === "tracked" ? "Tracked only" : f === "low" ? "Low stock" : "All items"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
        <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Stock report</span>
        <input
          type="date"
          value={reportFrom}
          onChange={(e) => setReportFrom(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
        />
        <span className="text-gray-500 dark:text-slate-400">to</span>
        <input
          type="date"
          value={reportTo}
          onChange={(e) => setReportTo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
        />
        <button
          type="button"
          onClick={fetchReport}
          disabled={reportLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-70"
        >
          {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {reportLoading ? "Generating…" : "Generate report"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    Reorder at
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                      {filter === "tracked"
                        ? "No items with stock tracking. Enable “Track stock” on items in the Items page."
                        : "No items match your filters."}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                        {item.sku || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                        {item.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.trackStock ? (
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.quantityInStock} {item.unit || "unit"}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-slate-300">
                        {item.trackStock && item.reorderLevel > 0
                          ? item.reorderLevel
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.trackStock && isLowStock(item) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low stock
                          </span>
                        ) : item.trackStock ? (
                          <span className="text-xs text-gray-500 dark:text-slate-400">OK</span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500">Not tracked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.trackStock && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openAdjust(item)}
                              className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700"
                              title="Adjust stock"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistory(item)}
                              className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                              title="Movement history"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust stock modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Adjust stock: {adjustModal.name}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Current: {adjustModal.quantityInStock} {adjustModal.unit || "unit"}
            </p>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={adjustForm.type}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  <option value="in">Stock In (add)</option>
                  <option value="out">Stock Out (remove)</option>
                  <option value="adjustment">Set to exact quantity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {adjustForm.type === "adjustment"
                    ? "New quantity"
                    : "Quantity"}
                  *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={adjustForm.quantity}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  placeholder={
                    adjustForm.type === "adjustment" ? "e.g. 50" : "e.g. 10"
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  placeholder="e.g. Restock, Sale, Count correction"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  value={adjustForm.reference}
                  onChange={(e) =>
                    setAdjustForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  placeholder="e.g. Invoice #, PO number"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-900 text-white font-medium hover:bg-blue-800 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Update stock"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Movement history: {historyModal.name}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {movementsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : movements.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 py-4">
                No movements yet.
              </p>
            ) : (
              <ul className="overflow-y-auto space-y-2">
                {movements.map((m) => (
                  <li
                    key={m._id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-800 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {m.type === "in" && (
                        <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                      {m.type === "out" && (
                        <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      {m.type === "adjustment" && (
                        <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                      <span className="font-medium capitalize">{m.type}</span>
                      <span className="text-gray-600 dark:text-slate-300">
                        {m.type === "adjustment"
                          ? `Set to ${m.quantity}`
                          : `${m.quantity} ${historyModal.unit || "unit"}`}
                      </span>
                      {m.reason && (
                        <span className="text-gray-500 dark:text-slate-400">
                          — {m.reason}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400 text-xs">
                      {moment(m.createdAt).format("MMM D, YYYY HH:mm")}
                      {m.user?.name && ` · ${m.user.name}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setHistoryModal(null)}
              className="mt-4 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stock report modal */}
      {reportOpen && reportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stock Report
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  type="button"
                  onClick={handleShareReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <Share2 className="w-4 h-4" /> Share link
                </button>
                <button
                  type="button"
                  onClick={() => { setReportOpen(false); setReportData(null); }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div ref={reportPrintRef} className="overflow-y-auto flex-1 space-y-6 text-gray-900 dark:text-slate-100">
              <div className="meta text-sm text-gray-500 dark:text-slate-400">
                Period: {moment(reportData.from).format("MMM D, YYYY")} – {moment(reportData.to).format("MMM D, YYYY")}
                <br />
                Generated: {moment(reportData.generatedAt).format("MMM D, YYYY HH:mm")}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Stock levels</h4>
                <table className="w-full border border-gray-300 dark:border-slate-600" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-800">
                      <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">Item</th>
                      <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">SKU</th>
                      <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-right">Quantity</th>
                      <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-right">Reorder level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.items || []).map((i) => (
                      <tr key={i._id}>
                        <td className="border border-gray-300 dark:border-slate-600 px-3 py-2">{i.name}</td>
                        <td className="border border-gray-300 dark:border-slate-600 px-3 py-2">{i.sku || "—"}</td>
                        <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-right">{i.quantityInStock} {i.unit || "unit"}</td>
                        <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-right">{i.reorderLevel ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="movements">
                <h4 className="font-semibold mb-2">Movements in period</h4>
                {(reportData.movements || []).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No movements in this period.</p>
                ) : (
                  <table className="w-full border border-gray-300 dark:border-slate-600" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr className="bg-gray-100 dark:bg-slate-800">
                        <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">Date</th>
                        <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">Item</th>
                        <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">Type</th>
                        <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-right">Qty</th>
                        <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">Reason</th>
                        <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-left">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.movements.map((m) => (
                        <tr key={m._id}>
                          <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm">{moment(m.createdAt).format("MMM D, YYYY HH:mm")}</td>
                          <td className="border border-gray-300 dark:border-slate-600 px-3 py-2">{m.item?.name ?? "—"}</td>
                          <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 capitalize">{m.type}</td>
                          <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-right">{m.type === "adjustment" ? `Set to ${m.quantity}` : m.quantity}</td>
                          <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm">{m.reason || "—"}</td>
                          <td className="border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm">{m.user?.name ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
