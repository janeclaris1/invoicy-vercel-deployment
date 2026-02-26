import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Target, Loader2, Edit2, Trash2, Eye } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const STATUS_LABELS = { new: "New", contacted: "Contacted", qualified: "Qualified", converted: "Converted", lost: "Lost" };

const LeadsPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "new",
    score: 0,
    contact: "",
    company: "",
    source: "",
    notes: "",
  });

  const fetchContactsAndCompanies = async () => {
    try {
      const [cRes, coRes] = await Promise.all([
        axiosInstance.get(API_PATHS.CRM.CONTACTS),
        axiosInstance.get(API_PATHS.CRM.COMPANIES),
      ]);
      setContacts(Array.isArray(cRes.data) ? cRes.data : []);
      setCompanies(Array.isArray(coRes.data) ? coRes.data : []);
    } catch (_) {
      setContacts([]);
      setCompanies([]);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.CRM.LEADS);
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (modalOpen) fetchContactsAndCompanies();
  }, [modalOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      status: "new",
      score: 0,
      contact: "",
      company: "",
      source: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || "",
      status: item.status || "new",
      score: item.score ?? 0,
      contact: item.contact?._id || item.contact || "",
      company: item.company?._id || item.company || "",
      source: item.source || "",
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
        score: Number(form.score) || 0,
        contact: form.contact || null,
        company: form.company || null,
        source: form.source.trim(),
        notes: form.notes.trim(),
      };
      if (editingId) {
        await axiosInstance.put(API_PATHS.CRM.LEAD(editingId), payload);
        toast.success("Lead updated");
      } else {
        await axiosInstance.post(API_PATHS.CRM.LEADS, payload);
        toast.success("Lead created");
      }
      setModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await axiosInstance.delete(API_PATHS.CRM.LEAD(id));
      toast.success("Lead deleted");
      fetchLeads();
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
        <p className="text-gray-500 text-sm">Track and score potential customers.</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New lead
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No leads yet. Add your first lead.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Score</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Company</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((l) => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/leads/${l._id}`)}
                      className="font-medium text-gray-900 hover:text-blue-600 text-left"
                    >
                      {l.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.score ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.company?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/crm/leads/${l._id}`)} className="p-2 text-gray-500 hover:text-blue-600" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(l)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(l._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editingId ? "Edit lead" : "New lead"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.score}
                  onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <select
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value || "" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value || "" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— None —</option>
                  {companies.map((co) => (
                    <option key={co._id} value={co._id}>{co.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[80px]"
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

export default LeadsPage;
