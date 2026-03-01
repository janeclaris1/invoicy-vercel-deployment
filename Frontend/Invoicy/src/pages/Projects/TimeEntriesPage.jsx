import React, { useState, useEffect } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";

const TimeEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [fromDate, setFromDate] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(moment().format("YYYY-MM-DD"));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    taskId: "",
    hours: "",
    date: moment().format("YYYY-MM-DD"),
    description: "",
  });
  const [projectTasks, setProjectTasks] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("projectId", projectFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await axiosInstance.get(`${API_PATHS.PROJECTS.TIME_ENTRIES}?${params.toString()}`);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load time entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PROJECTS.LIST);
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [projectFilter, fromDate, toDate]);

  useEffect(() => {
    if (!form.projectId) {
      setProjectTasks([]);
      return;
    }
    const load = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.PROJECTS.TASKS(form.projectId));
        setProjectTasks(Array.isArray(res.data) ? res.data : []);
      } catch {
        setProjectTasks([]);
      }
    };
    load();
  }, [form.projectId]);

  const openCreate = () => {
    setForm({
      projectId: projects[0]?._id || "",
      taskId: "",
      hours: "",
      date: moment().format("YYYY-MM-DD"),
      description: "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.projectId || !form.hours || Number(form.hours) <= 0 || !form.date) {
      toast.error("Project, hours and date are required");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.PROJECTS.TIME_ENTRIES, {
        projectId: form.projectId,
        taskId: form.taskId || null,
        hours: Number(form.hours),
        date: form.date,
        description: form.description.trim(),
      });
      toast.success("Time entry added");
      setShowModal(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this time entry?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PROJECTS.TIME_ENTRY_DELETE(id));
      toast.success("Time entry deleted");
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  if (loading && entries.length === 0) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5" /> Time entries
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Log and view time across projects</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Log time</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
        <span className="text-gray-500">to</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
      </div>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total: {totalHours.toFixed(1)} hours</p>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Project</th>
              <th className="px-4 py-3 text-left font-medium">Task</th>
              <th className="px-4 py-3 text-right font-medium">Hours</th>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No time entries in this range. Log time to get started.</td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e._id}>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.date ? moment(e.date).format("MMM D, YYYY") : "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.project?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.task?.name || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{e.hours}h</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.user?.name || e.user?.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleDelete(e._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log time</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
                <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, taskId: "" }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required>
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task (optional)</label>
                <select value={form.taskId} onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="">— No task —</option>
                  {projectTasks.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours *</label>
                <input type="number" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} step="0.25" min="0.25" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Log time"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeEntriesPage;
