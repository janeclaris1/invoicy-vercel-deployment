import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const BOMPage = () => {
  const [boms, setBoms] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentFilter, setParentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ parentItem: "", childItem: "", quantity: 1, unit: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchBoms = async () => {
    try {
      const params = parentFilter ? `?parentItem=${parentFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.PRODUCTION.BOMS + params);
      setBoms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load BOMs");
      setBoms([]);
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
    fetchBoms();
  }, [parentFilter]);
  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      parentItem: parentFilter || items[0]?._id || "",
      childItem: items[0]?._id || "",
      quantity: 1,
      unit: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (bom) => {
    setEditing(bom);
    setForm({
      parentItem: bom.parentItem?._id || bom.parentItem || "",
      childItem: bom.childItem?._id || bom.childItem || "",
      quantity: bom.quantity ?? 1,
      unit: bom.unit || "",
      notes: bom.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.parentItem || !form.childItem || form.quantity <= 0) {
      toast.error("Parent, child, and quantity are required");
      return;
    }
    if (form.parentItem === form.childItem) {
      toast.error("Parent and child must be different items");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await axiosInstance.put(API_PATHS.PRODUCTION.BOM(editing._id), { quantity: form.quantity, unit: form.unit, notes: form.notes });
        toast.success("BOM updated");
      } else {
        await axiosInstance.post(API_PATHS.PRODUCTION.BOMS, form);
        toast.success("BOM line added");
      }
      setShowModal(false);
      fetchBoms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bom) => {
    if (!window.confirm("Remove this BOM line?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PRODUCTION.BOM(bom._id));
      toast.success("BOM line removed");
      fetchBoms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bill of Materials</h2>
        <div className="flex items-center gap-2">
          <select
            value={parentFilter}
            onChange={(e) => setParentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All parents</option>
            {items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add BOM line</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Parent (product)</th>
              <th className="px-4 py-3 text-left font-medium">Child (component)</th>
              <th className="px-4 py-3 text-right font-medium">Quantity</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {boms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No BOM lines. Add a parent-child quantity to define how products are made.</td>
              </tr>
            ) : (
              boms.map((b) => (
                <tr key={b._id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.parentItem?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{b.childItem?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">{b.quantity}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.unit || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(b)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 inline" /></button>
                    <button type="button" onClick={() => handleDelete(b)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 inline" /></button>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit BOM line" : "Add BOM line"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent product *</label>
                <select value={form.parentItem} onChange={(e) => setForm((f) => ({ ...f, parentItem: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required disabled={!!editing}>
                  {items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child component *</label>
                <select value={form.childItem} onChange={(e) => setForm((f) => ({ ...f, childItem: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required disabled={!!editing}>
                  {items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} step="0.0001" min="0.0001" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                <input type="text" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="e.g. unit, kg" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOMPage;
