import React, { useState, useEffect } from "react";
import { Plus, Zap, Loader2, Edit2, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const TRIGGER_LABELS = {
  signup: "On signup",
  invoice_sent: "Invoice sent",
  invoice_paid: "Invoice paid",
  manual: "Manual",
};

const AutomationPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", triggerType: "signup", isActive: true });

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.MARKETING.WORKFLOWS);
      setWorkflows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load workflows");
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", triggerType: "signup", isActive: true });
    setModalOpen(true);
  };

  const openEdit = (w) => {
    setEditingId(w._id);
    setForm({
      name: w.name || "",
      triggerType: w.triggerType || "signup",
      isActive: w.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Workflow name is required");
      return;
    }
    try {
      const payload = { name: form.name.trim(), triggerType: form.triggerType, isActive: form.isActive };
      if (editingId) {
        await axiosInstance.put(API_PATHS.MARKETING.WORKFLOW(editingId), payload);
        toast.success("Workflow updated");
      } else {
        await axiosInstance.post(API_PATHS.MARKETING.WORKFLOWS, payload);
        toast.success("Workflow created");
      }
      setModalOpen(false);
      fetchWorkflows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this workflow?")) return;
    try {
      await axiosInstance.delete(API_PATHS.MARKETING.WORKFLOW(id));
      toast.success("Workflow deleted");
      fetchWorkflows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const toggleActive = async (w) => {
    try {
      await axiosInstance.put(API_PATHS.MARKETING.WORKFLOW(w._id), { isActive: !w.isActive });
      toast.success(w.isActive ? "Workflow paused" : "Workflow enabled");
      fetchWorkflows();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Automated emails and actions based on triggers.</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New workflow
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {workflows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No workflows yet. Create one to automate emails and actions.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Trigger</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workflows.map((w) => (
                <tr key={w._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{TRIGGER_LABELS[w.triggerType] || w.triggerType}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(w)}
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        w.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {w.isActive ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(w)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(w._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editingId ? "Edit workflow" : "New workflow"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Welcome email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
                <select
                  value={form.triggerType}
                  onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="signup">On signup</option>
                  <option value="invoice_sent">Invoice sent</option>
                  <option value="invoice_paid">Invoice paid</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  {editingId ? "Update" : "Create"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationPage;
