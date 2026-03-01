import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const WarehousesPage = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", isDefault: false, isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchWarehouses = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.WAREHOUSES);
      setWarehouses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load warehouses");
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", isDefault: false, isActive: true });
    setShowModal(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setForm({ name: w.name || "", code: w.code || "", address: w.address || "", isDefault: !!w.isDefault, isActive: w.isActive !== false });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await axiosInstance.put(API_PATHS.SUPPLY_CHAIN.WAREHOUSE(editing._id), form);
        toast.success("Warehouse updated");
      } else {
        await axiosInstance.post(API_PATHS.SUPPLY_CHAIN.WAREHOUSES, form);
        toast.success("Warehouse created");
      }
      setShowModal(false);
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`Delete warehouse "${w.name}"?`)) return;
    try {
      await axiosInstance.delete(API_PATHS.SUPPLY_CHAIN.WAREHOUSE(w._id));
      toast.success("Warehouse deleted");
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Warehouses</h2>
        <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add warehouse</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
            <p className="text-gray-600 dark:text-gray-400">No warehouses. Add locations for stock levels and PO receiving.</p>
            <Button onClick={openCreate} className="mt-4">Add warehouse</Button>
          </div>
        ) : (
          warehouses.map((w) => (
            <div key={w._id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{w.name}</h3>
                  {w.code && <span className="text-xs text-gray-500">{w.code}</span>}
                  {w.address && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{w.address}</p>}
                  {w.isDefault && <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Default</span>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(w)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDelete(w)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit warehouse" : "Add warehouse"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label><input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label><input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div><label className="flex items-center gap-2"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded" /><span className="text-sm text-gray-700 dark:text-gray-300">Default warehouse</span></label></div>
              <div className="flex gap-2 justify-end pt-2"><Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarehousesPage;
