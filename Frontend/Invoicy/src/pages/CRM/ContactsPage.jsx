import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, User, Loader2, Edit2, Trash2, Eye } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const ContactsPage = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    company: "",
    source: "",
    notes: "",
  });

  const fetchCompanies = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.COMPANIES);
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setCompanies([]);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.CRM.CONTACTS);
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (modalOpen) fetchCompanies();
  }, [modalOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      company: "",
      source: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      jobTitle: c.jobTitle || "",
      company: c.company?._id || c.company || "",
      source: c.source || "",
      notes: c.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        jobTitle: form.jobTitle.trim(),
        company: form.company || null,
        source: form.source.trim(),
        notes: form.notes.trim(),
      };
      if (editingId) {
        await axiosInstance.put(API_PATHS.CRM.CONTACT(editingId), payload);
        toast.success("Contact updated");
      } else {
        await axiosInstance.post(API_PATHS.CRM.CONTACTS, payload);
        toast.success("Contact created");
      }
      setModalOpen(false);
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contact?")) return;
    try {
      await axiosInstance.delete(API_PATHS.CRM.CONTACT(id));
      toast.success("Contact deleted");
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";

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
        <p className="text-gray-500 text-sm">People you do business with.</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New contact
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {contacts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No contacts yet. Add your first contact.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Company</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contacts.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/contacts/${c._id}`)}
                      className="font-medium text-gray-900 hover:text-blue-600 text-left"
                    >
                      {fullName(c)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.company?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/crm/contacts/${c._id}`)} className="p-2 text-gray-500 hover:text-blue-600" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(c)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
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
              <h2 className="text-lg font-semibold">{editingId ? "Edit contact" : "New contact"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
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
                  placeholder="e.g. website, referral"
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

export default ContactsPage;
