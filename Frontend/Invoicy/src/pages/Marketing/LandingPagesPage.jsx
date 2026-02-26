import React, { useState, useEffect } from "react";
import { Plus, Layout, Loader2, Edit2, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const LandingPagesPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", status: "draft", metaTitle: "", metaDescription: "" });

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.MARKETING.LANDING_PAGES);
      setPages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load landing pages");
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", slug: "", content: "", status: "draft", metaTitle: "", metaDescription: "" });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      title: p.title || "",
      slug: p.slug || "",
      content: p.content || "",
      status: p.status || "draft",
      metaTitle: p.metaTitle || "",
      metaDescription: p.metaDescription || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        content: form.content,
        status: form.status,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      };
      if (editingId) {
        await axiosInstance.put(API_PATHS.MARKETING.LANDING_PAGE(editingId), payload);
        toast.success("Landing page updated");
      } else {
        await axiosInstance.post(API_PATHS.MARKETING.LANDING_PAGES, payload);
        toast.success("Landing page created");
      }
      setModalOpen(false);
      fetchPages();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this landing page?")) return;
    try {
      await axiosInstance.delete(API_PATHS.MARKETING.LANDING_PAGE(id));
      toast.success("Landing page deleted");
      fetchPages();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
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
        <p className="text-gray-500 text-sm">Create and manage custom landing and sales pages.</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New page
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {pages.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Layout className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No landing pages yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Slug</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editingId ? "Edit landing page" : "New landing page"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Summer Sale"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL path)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                  placeholder="e.g. summer-sale (leave empty to auto-generate)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML or text)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[120px] font-mono text-sm"
                  placeholder="Page content..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
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

export default LandingPagesPage;
