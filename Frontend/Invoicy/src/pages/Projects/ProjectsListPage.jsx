import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderKanban, Calendar, Target, Clock, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const statusLabels = { planning: "Planning", active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled" };
const statusColors = {
  planning: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

const ProjectsListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning",
    startDate: "",
    endDate: "",
    budgetAmount: "",
    clientName: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchProjects = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.PROJECTS.LIST + params);
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      status: "planning",
      startDate: "",
      endDate: "",
      budgetAmount: "",
      clientName: "",
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      status: p.status || "planning",
      startDate: p.startDate ? moment(p.startDate).format("YYYY-MM-DD") : "",
      endDate: p.endDate ? moment(p.endDate).format("YYYY-MM-DD") : "",
      budgetAmount: p.budgetAmount != null ? p.budgetAmount : "",
      clientName: p.clientName || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budgetAmount: form.budgetAmount !== "" ? Number(form.budgetAmount) : null,
        clientName: form.clientName.trim(),
      };
      if (editing) {
        await axiosInstance.put(API_PATHS.PROJECTS.UPDATE(editing._id), payload);
        toast.success("Project updated");
      } else {
        await axiosInstance.post(API_PATHS.PROJECTS.CREATE, payload);
        toast.success("Project created");
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? All tasks, milestones and time entries will be removed.`)) return;
    try {
      await axiosInstance.delete(API_PATHS.PROJECTS.DELETE(project._id));
      toast.success("Project deleted");
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage projects, tasks, and track time</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
            <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No projects yet</p>
            <Button onClick={openCreate} className="mt-4">Create your first project</Button>
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p._id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusColors[p.status] || ""}`}>
                    {statusLabels[p.status] || p.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{p.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {p.taskCount ?? 0} tasks</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {p.milestoneCount ?? 0} milestones</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {(p.totalHours ?? 0).toFixed(1)}h</span>
              </div>
              {p.budgetAmount != null && <p className="text-xs text-gray-500 dark:text-gray-400">Budget: {formatCurrency(p.budgetAmount, p.currency || user?.currency || "GHS")}</p>}
              <Button variant="ghost" size="small" className="w-full mt-2 flex items-center justify-center gap-1" onClick={() => navigate(`/projects/${p._id}`)}>
                Open <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit project" : "New project"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget amount</label>
                <input type="number" value={form.budgetAmount} onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))} step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client name</label>
                <input type="text" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Optional" />
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

export default ProjectsListPage;
