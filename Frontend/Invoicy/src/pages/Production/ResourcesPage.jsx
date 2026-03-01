import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", type: "machine", capacityPerDay: "", capacityUnit: "hours", isActive: true, notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchResources = async () => {
    try {
      const params = typeFilter ? `?type=${typeFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.PRODUCTION.RESOURCES + params);
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load resources");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, [typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "machine", capacityPerDay: "", capacityUnit: "hours", isActive: true, notes: "" });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name || "",
      type: r.type || "machine",
      capacityPerDay: r.capacityPerDay ?? "",
      capacityUnit: r.capacityUnit || "hours",
      isActive: r.isActive !== false,
      notes: r.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        capacityPerDay: form.capacityPerDay !== "" ? Number(form.capacityPerDay) : null,
        capacityUnit: form.capacityUnit,
        isActive: form.isActive,
        notes: form.notes.trim(),
      };
      if (editing) {
        await axiosInstance.put(API_PATHS.PRODUCTION.RESOURCE(editing._id), payload);
        toast.success("Resource updated");
      } else {
        await axiosInstance.post(API_PATHS.PRODUCTION.RESOURCES, payload);
        toast.success("Resource created");
      }
      setShowModal(false);
      fetchResources();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Delete resource \"" + r.name + "\"?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PRODUCTION.RESOURCE(r._id));
      toast.success("Resource deleted");
      fetchResources();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resources</h2>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
            <option value="">All types</option>
            <option value="machine">Machine</option>
            <option value="labor">Labor</option>
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add resource</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
            <p className="text-gray-600 dark:text-gray-400">No resources yet. Add machines or labor for capacity planning.</p>
            <Button onClick={openCreate} className="mt-4">Add resource</Button>
          </div>
        ) : (
          resources.map((r) => (
            <div key={r._id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{r.name}</h3>
                  <span className="text-xs capitalize text-gray-500">{r.type}</span>
                  {r.capacityPerDay != null && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.capacityPerDay} {r.capacityUnit}/day</p>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDelete(r)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {!r.isActive && <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Inactive</span>}
            </div>
          ))
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit resource" : "Add resource"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="machine">Machine</option>
                  <option value="labor">Labor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity per day</label>
                <input type="number" value={form.capacityPerDay} onChange={(e) => setForm((f) => ({ ...f, capacityPerDay: e.target.value }))} step="0.5" min="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
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

export default ResourcesPage;
