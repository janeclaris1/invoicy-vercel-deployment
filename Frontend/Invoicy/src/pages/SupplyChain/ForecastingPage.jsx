import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const ForecastingPage = () => {
  const [forecasts, setForecasts] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ itemId: "", periodType: "monthly", periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, quantity: 0 });
  const [saving, setSaving] = useState(false);

  const fetchForecasts = async () => {
    try {
      const res = await axiosInstance.get(`${API_PATHS.SUPPLY_CHAIN.FORECASTS}?periodYear=${yearFilter}`);
      setForecasts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load forecasts");
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, [yearFilter]);
  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ itemId: items[0]?._id || "", periodType: "monthly", periodYear: yearFilter, periodMonth: new Date().getMonth() + 1, quantity: 0 });
    setShowModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      itemId: f.item?._id || f.item,
      periodType: f.periodType || "monthly",
      periodYear: f.periodYear,
      periodMonth: f.periodMonth ?? "",
      quantity: f.quantity ?? 0,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.itemId || form.quantity == null) { toast.error("Item and quantity are required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await axiosInstance.put(API_PATHS.SUPPLY_CHAIN.FORECAST(editing._id), { quantity: form.quantity, periodYear: form.periodYear, periodMonth: form.periodMonth || null });
        toast.success("Forecast updated");
      } else {
        await axiosInstance.post(API_PATHS.SUPPLY_CHAIN.FORECASTS, {
          itemId: form.itemId,
          periodType: form.periodType,
          periodYear: form.periodYear,
          periodMonth: form.periodMonth || null,
          quantity: Number(form.quantity),
        });
        toast.success("Forecast added");
      }
      setShowModal(false);
      fetchForecasts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f) => {
    if (!window.confirm("Delete this forecast?")) return;
    try {
      await axiosInstance.delete(API_PATHS.SUPPLY_CHAIN.FORECAST(f._id));
      toast.success("Forecast deleted");
      fetchForecasts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const yearOptions = [new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1];

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Demand forecasting</h2>
        <div className="flex items-center gap-2">
          <select value={yearFilter} onChange={(e) => setYearFilter(Number(e.target.value))} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add forecast</Button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium">Period</th>
              <th className="px-4 py-3 text-right font-medium">Quantity</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {forecasts.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No forecasts for this year. Add demand forecasts for planning.</td></tr>
            ) : (
              forecasts.map((f) => (
                <tr key={f._id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.item?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{f.periodYear}{f.periodMonth != null ? `-${String(f.periodMonth).padStart(2, "0")}` : ""} ({f.periodType})</td>
                  <td className="px-4 py-3 text-right">{f.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(f)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 inline" /></button>
                    <button type="button" onClick={() => handleDelete(f)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit forecast" : "Add forecast"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item *</label><select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required disabled={!!editing}>{items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label><input type="number" value={form.periodYear} onChange={(e) => setForm((f) => ({ ...f, periodYear: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month (1-12, optional)</label><input type="number" min={1} max={12} value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Leave empty for yearly" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label><input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} min={0} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required /></div>
              <div className="flex gap-2 justify-end pt-2"><Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForecastingPage;
