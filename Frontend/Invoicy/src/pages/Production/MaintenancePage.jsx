import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Calendar, FileText } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";

const MaintenancePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ resourceId: "", frequency: "monthly", description: "", nextDueAt: "" });
  const [logForm, setLogForm] = useState({ resourceId: "", performedAt: moment().format("YYYY-MM-DDTHH:mm"), description: "", performedBy: "", outcome: "ok" });
  const [saving, setSaving] = useState(false);

  const fetchSchedules = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PRODUCTION.MAINTENANCE_SCHEDULES);
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSchedules([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PRODUCTION.MAINTENANCE_LOGS);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLogs([]);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PRODUCTION.RESOURCES);
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch {
      setResources([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSchedules(), fetchLogs(), fetchResources()]);
      setLoading(false);
    };
    load();
  }, []);

  const openScheduleCreate = () => {
    setEditingSchedule(null);
    setScheduleForm({ resourceId: resources[0]?._id || "", frequency: "monthly", description: "", nextDueAt: "" });
    setScheduleModal(true);
  };

  const openScheduleEdit = (s) => {
    setEditingSchedule(s);
    setScheduleForm({
      resourceId: s.resource?._id || s.resource || "",
      frequency: s.frequency || "monthly",
      description: s.description || "",
      nextDueAt: s.nextDueAt ? moment(s.nextDueAt).format("YYYY-MM-DD") : "",
    });
    setScheduleModal(true);
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.resourceId) { toast.error("Resource is required"); return; }
    setSaving(true);
    try {
      if (editingSchedule) {
        await axiosInstance.put(API_PATHS.PRODUCTION.MAINTENANCE_SCHEDULE(editingSchedule._id), {
          frequency: scheduleForm.frequency,
          description: scheduleForm.description,
          nextDueAt: scheduleForm.nextDueAt || null,
        });
        toast.success("Schedule updated");
      } else {
        await axiosInstance.post(API_PATHS.PRODUCTION.MAINTENANCE_SCHEDULES, {
          resourceId: scheduleForm.resourceId,
          frequency: scheduleForm.frequency,
          description: scheduleForm.description,
          nextDueAt: scheduleForm.nextDueAt || null,
        });
        toast.success("Schedule created");
      }
      setScheduleModal(false);
      fetchSchedules();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm("Delete this schedule?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PRODUCTION.MAINTENANCE_SCHEDULE(id));
      toast.success("Schedule deleted");
      fetchSchedules();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const openLogCreate = () => {
    setLogForm({
      resourceId: resources[0]?._id || "",
      performedAt: moment().format("YYYY-MM-DDTHH:mm"),
      description: "",
      performedBy: "",
      outcome: "ok",
    });
    setLogModal(true);
  };

  const saveLog = async (e) => {
    e.preventDefault();
    if (!logForm.resourceId || !logForm.performedAt) { toast.error("Resource and date are required"); return; }
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.PRODUCTION.MAINTENANCE_LOGS, {
        resourceId: logForm.resourceId,
        performedAt: logForm.performedAt,
        description: logForm.description,
        performedBy: logForm.performedBy,
        outcome: logForm.outcome,
      });
      toast.success("Maintenance log added");
      setLogModal(false);
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Calendar className="w-5 h-5" /> Maintenance schedules</h2>
          <Button onClick={openScheduleCreate} size="small" className="flex items-center gap-1"><Plus className="w-4 h-4" /> Add schedule</Button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Resource</th>
                <th className="px-4 py-3 text-left font-medium">Frequency</th>
                <th className="px-4 py-3 text-left font-medium">Next due</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {schedules.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No schedules. Add one to plan recurring maintenance.</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s._id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.resource?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{s.frequency}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.nextDueAt ? moment(s.nextDueAt).format("MMM D, YYYY") : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openScheduleEdit(s)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 inline" /></button>
                      <button type="button" onClick={() => deleteSchedule(s._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 inline" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Maintenance logs</h2>
          <Button onClick={openLogCreate} size="small" className="flex items-center gap-1"><Plus className="w-4 h-4" /> Log maintenance</Button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Resource</th>
                <th className="px-4 py-3 text-left font-medium">Performed at</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No logs yet. Log maintenance after it is performed.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.resource?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{l.performedAt ? moment(l.performedAt).format("MMM D, YYYY HH:mm") : "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{l.description || "—"}</td>
                    <td className="px-4 py-3 capitalize">{l.outcome}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingSchedule ? "Edit schedule" : "Add schedule"}</h3>
            <form onSubmit={saveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource *</label>
                <select value={scheduleForm.resourceId} onChange={(e) => setScheduleForm((f) => ({ ...f, resourceId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required disabled={!!editingSchedule}>
                  {resources.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                <select value={scheduleForm.frequency} onChange={(e) => setScheduleForm((f) => ({ ...f, frequency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next due date</label>
                <input type="date" value={scheduleForm.nextDueAt} onChange={(e) => setScheduleForm((f) => ({ ...f, nextDueAt: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={scheduleForm.description} onChange={(e) => setScheduleForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setScheduleModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {logModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log maintenance</h3>
            <form onSubmit={saveLog} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource *</label>
                <select value={logForm.resourceId} onChange={(e) => setLogForm((f) => ({ ...f, resourceId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required>
                  {resources.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Performed at *</label>
                <input type="datetime-local" value={logForm.performedAt} onChange={(e) => setLogForm((f) => ({ ...f, performedAt: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={logForm.description} onChange={(e) => setLogForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Performed by</label>
                <input type="text" value={logForm.performedBy} onChange={(e) => setLogForm((f) => ({ ...f, performedBy: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcome</label>
                <select value={logForm.outcome} onChange={(e) => setLogForm((f) => ({ ...f, outcome: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="ok">OK</option>
                  <option value="issues">Issues found</option>
                  <option value="deferred">Deferred</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setLogModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Log"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
