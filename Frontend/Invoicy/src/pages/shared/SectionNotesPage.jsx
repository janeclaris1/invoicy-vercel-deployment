import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const sectionLabel = { projects: "Project Management", production: "Production & Operations", supply_chain: "Supply Chain & Inventory" };

export default function SectionNotesPage() {
  const location = useLocation();
  const section = location.pathname.startsWith("/projects") ? "projects" : location.pathname.startsWith("/production") ? "production" : "supply_chain";
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SECTION_NOTES.LIST + `?section=${section}`);
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [section]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", body: "" });
    setModalOpen(true);
  };

  const openEdit = (n) => {
    setEditing(n);
    setForm({ title: n.title || "", body: n.body || "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await axiosInstance.put(API_PATHS.SECTION_NOTES.UPDATE(editing._id), { title: form.title.trim(), body: form.body });
      } else {
        await axiosInstance.post(API_PATHS.SECTION_NOTES.CREATE, { section, title: form.title.trim(), body: form.body });
      }
      setModalOpen(false);
      fetchNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await axiosInstance.delete(API_PATHS.SECTION_NOTES.DELETE(id));
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="py-8 text-gray-500">Loading notes…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes – {sectionLabel[section]}
          </h2>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 text-white border border-white rounded-lg hover:bg-white/10 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add note
          </button>
        </div>
      </div>
      {notes.length === 0 ? (
        <p className="text-gray-500 py-8">No notes yet. Add one to keep track of ideas and decisions.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n._id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{n.title}</p>
                  {n.body && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.body}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => openEdit(n)} className="p-2 text-gray-500 hover:text-blue-600 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDelete(n._id)} className="p-2 text-gray-500 hover:text-red-600 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit note" : "New note"}</h3>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Content (optional)"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
