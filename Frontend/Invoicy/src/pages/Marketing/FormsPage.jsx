import React, { useState, useEffect } from "react";
import { Plus, FileInput, Loader2, Edit2, Trash2, Copy } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const FIELD_TYPES = [
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Paragraph" },
  { value: "select", label: "Dropdown" },
];

const FormsPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", fields: [], submitButtonText: "Submit", redirectUrl: "" });

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.MARKETING.FORMS);
      setForms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load forms");
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const addField = () => {
    setForm((f) => ({
      ...f,
      fields: [...(f.fields || []), { id: `f_${Date.now()}`, label: "New field", type: "text", required: false }],
    }));
  };

  const updateField = (index, key, value) => {
    setForm((f) => {
      const next = [...(f.fields || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...f, fields: next };
    });
  };

  const removeField = (index) => {
    setForm((f) => ({ ...f, fields: f.fields.filter((_, i) => i !== index) }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", fields: [], submitButtonText: "Submit", redirectUrl: "" });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      fields: (item.fields || []).map((f, i) => ({ ...f, id: f.id || `f_${i}` })),
      submitButtonText: item.submitButtonText || "Submit",
      redirectUrl: item.redirectUrl || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Form name is required");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        fields: form.fields,
        submitButtonText: form.submitButtonText,
        redirectUrl: form.redirectUrl,
      };
      if (editingId) {
        await axiosInstance.put(API_PATHS.MARKETING.FORM(editingId), payload);
        toast.success("Form updated");
      } else {
        await axiosInstance.post(API_PATHS.MARKETING.FORMS, payload);
        toast.success("Form created");
      }
      setModalOpen(false);
      fetchForms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this form?")) return;
    try {
      await axiosInstance.delete(API_PATHS.MARKETING.FORM(id));
      toast.success("Form deleted");
      fetchForms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const copyEmbedUrl = (id) => {
    const base = import.meta.env.VITE_API_URL || window.location.origin;
    const url = `${base.replace(/\/$/, "")}/api/marketing/forms/${id}/public`;
    navigator.clipboard.writeText(url);
    toast.success("Form API URL copied");
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
        <p className="text-gray-500 text-sm">Create forms for lead capture; embed on landing pages (HubSpot-style).</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New form
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {forms.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileInput className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No forms yet. Create one to capture leads.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Fields</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forms.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(item.fields || []).length} fields</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <button onClick={() => copyEmbedUrl(item._id)} className="p-2 text-gray-500 hover:text-blue-600" title="Copy form URL">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(item)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editingId ? "Edit form" : "New form"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Contact us"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Fields</label>
                  <button type="button" onClick={addField} className="text-sm text-blue-600 hover:underline">
                    + Add field
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.fields || []).map((field, i) => (
                    <div key={field.id} className="flex gap-2 items-start p-2 border border-gray-200 rounded-lg">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(i, "label", e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Label"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateField(i, "type", e.target.value)}
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                        <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(i, "required", e.target.checked)} />
                        Required
                      </label>
                      <button type="button" onClick={() => removeField(i)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Submit button text</label>
                <input
                  type="text"
                  value={form.submitButtonText}
                  onChange={(e) => setForm((f) => ({ ...f, submitButtonText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URL after submit</label>
                <input
                  type="url"
                  value={form.redirectUrl}
                  onChange={(e) => setForm((f) => ({ ...f, redirectUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
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

export default FormsPage;
