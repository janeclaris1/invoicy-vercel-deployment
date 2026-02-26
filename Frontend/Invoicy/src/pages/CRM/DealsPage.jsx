import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Briefcase, Loader2, Edit2, Trash2, Eye } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const STAGE_LABELS = {
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const DealsPage = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    value: "",
    currency: "GHS",
    stage: "qualification",
    contact: "",
    lead: "",
    company: "",
    expectedCloseDate: "",
    notes: "",
  });

  const fetchContactsLeadsAndCompanies = async () => {
    try {
      const [cRes, lRes, coRes] = await Promise.all([
        axiosInstance.get(API_PATHS.CRM.CONTACTS),
        axiosInstance.get(API_PATHS.CRM.LEADS),
        axiosInstance.get(API_PATHS.CRM.COMPANIES),
      ]);
      setContacts(Array.isArray(cRes.data) ? cRes.data : []);
      setLeads(Array.isArray(lRes.data) ? lRes.data : []);
      setCompanies(Array.isArray(coRes.data) ? coRes.data : []);
    } catch (_) {
      setContacts([]);
      setLeads([]);
      setCompanies([]);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.CRM.DEALS);
      setDeals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load deals");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    if (modalOpen) fetchContactsLeadsAndCompanies();
  }, [modalOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      value: "",
      currency: "GHS",
      stage: "qualification",
      contact: "",
      lead: "",
      company: "",
      expectedCloseDate: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      value: item.value ?? "",
      currency: item.currency || "GHS",
      stage: item.stage || "qualification",
      contact: item.contact?._id || item.contact || "",
      lead: item.lead?._id || item.lead || "",
      company: item.company?._id || item.company || "",
      expectedCloseDate: item.expectedCloseDate ? item.expectedCloseDate.slice(0, 10) : "",
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Deal name is required");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        value: Number(form.value) || 0,
        currency: form.currency || "GHS",
        stage: form.stage,
        contact: form.contact || null,
        lead: form.lead || null,
        company: form.company || null,
        expectedCloseDate: form.expectedCloseDate || null,
        notes: form.notes.trim(),
      };
      if (editingId) {
        await axiosInstance.put(API_PATHS.CRM.DEAL(editingId), payload);
        toast.success("Deal updated");
      } else {
        await axiosInstance.post(API_PATHS.CRM.DEALS, payload);
        toast.success("Deal created");
      }
      setModalOpen(false);
      fetchDeals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this deal?")) return;
    try {
      await axiosInstance.delete(API_PATHS.CRM.DEAL(id));
      toast.success("Deal deleted");
      fetchDeals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const stageColor = (stage) => {
    if (stage === "won") return "bg-emerald-100 text-emerald-800";
    if (stage === "lost") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-700";
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
        <p className="text-gray-500 text-sm">Pipeline opportunities and revenue.</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New deal
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {deals.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No deals yet. Add your first deal.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Deal</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Customer / Lead</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Value</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Stage</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Company</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deals.map((d) => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/deals/${d._id}`)}
                      className="font-medium text-gray-900 hover:text-blue-600 text-left"
                    >
                      {d.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {d.contact ? `${d.contact.firstName || ""} ${d.contact.lastName || ""}`.trim() || "—" : d.lead?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {d.currency} {Number(d.value).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${stageColor(d.stage)}`}>
                      {STAGE_LABELS[d.stage] || d.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.company?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/crm/deals/${d._id}`)} className="p-2 text-gray-500 hover:text-blue-600" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(d)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(d._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
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
              <h2 className="text-lg font-semibold">{editingId ? "Edit deal" : "New deal"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.entries(STAGE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected close date</label>
                <input
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer (contact)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead</label>
                <select
                  value={form.lead}
                  onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value || "" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— None —</option>
                  {leads.map((l) => (
                    <option key={l._id} value={l._id}>{l.name}</option>
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

export default DealsPage;
