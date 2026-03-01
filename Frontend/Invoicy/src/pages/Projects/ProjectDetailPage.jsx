import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, Target, Clock, Pencil, Trash2, X, CheckCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const statusLabels = { planning: "Planning", active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled" };
const taskStatusLabels = { todo: "To do", in_progress: "In progress", review: "Review", done: "Done" };
const priorityLabels = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskModal, setTaskModal] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [taskForm, setTaskForm] = useState({ name: "", description: "", status: "todo", priority: "medium", dueDate: "", estimatedHours: "", assignee: "" });
  const [milestoneForm, setMilestoneForm] = useState({ name: "", description: "", dueDate: "", status: "pending" });
  const [timeForm, setTimeForm] = useState({ taskId: "", hours: "", date: moment().format("YYYY-MM-DD"), description: "" });
  const [saving, setSaving] = useState(false);

  const fetchProject = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PROJECTS.GET(id));
      setProject(res.data);
    } catch {
      setProject(null);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PROJECTS.TASKS(id));
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTasks([]);
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.PROJECTS.MILESTONES(id));
      setMilestones(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMilestones([]);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const res = await axiosInstance.get(`${API_PATHS.PROJECTS.TIME_ENTRIES}?projectId=${id}`);
      setTimeEntries(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTimeEntries([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchProject();
      await Promise.all([fetchTasks(), fetchMilestones(), fetchTimeEntries()]);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.AUTH.TEAM);
        const list = res.data?.members || res.data || [];
        setTeamMembers(Array.isArray(list) ? list : []);
      } catch {
        setTeamMembers([]);
      }
    };
    loadTeam();
  }, []);

  const openTaskCreate = () => {
    setEditingTask(null);
    setTaskForm({ name: "", description: "", status: "todo", priority: "medium", dueDate: "", estimatedHours: "", assignee: "" });
    setTaskModal(true);
  };

  const openTaskEdit = (t) => {
    setEditingTask(t);
    setTaskForm({
      name: t.name || "",
      description: t.description || "",
      status: t.status || "todo",
      priority: t.priority || "medium",
      dueDate: t.dueDate ? moment(t.dueDate).format("YYYY-MM-DD") : "",
      estimatedHours: t.estimatedHours ?? "",
      assignee: t.assignee?._id || t.assignee || "",
    });
    setTaskModal(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim()) { toast.error("Task name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: taskForm.name.trim(),
        description: taskForm.description.trim(),
        status: taskForm.status,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || null,
        estimatedHours: taskForm.estimatedHours !== "" ? Number(taskForm.estimatedHours) : null,
        assignee: taskForm.assignee || null,
      };
      if (editingTask) {
        await axiosInstance.put(API_PATHS.PROJECTS.TASK_UPDATE(id, editingTask._id), payload);
        toast.success("Task updated");
      } else {
        await axiosInstance.post(API_PATHS.PROJECTS.TASKS(id), payload);
        toast.success("Task added");
      }
      setTaskModal(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PROJECTS.TASK_DELETE(id, taskId));
      toast.success("Task deleted");
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const openMilestoneCreate = () => {
    setEditingMilestone(null);
    setMilestoneForm({ name: "", description: "", dueDate: "", status: "pending" });
    setMilestoneModal(true);
  };

  const openMilestoneEdit = (m) => {
    setEditingMilestone(m);
    setMilestoneForm({
      name: m.name || "",
      description: m.description || "",
      dueDate: m.dueDate ? moment(m.dueDate).format("YYYY-MM-DD") : "",
      status: m.status || "pending",
    });
    setMilestoneModal(true);
  };

  const saveMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.name.trim()) { toast.error("Milestone name is required"); return; }
    setSaving(true);
    try {
      const payload = { name: milestoneForm.name.trim(), description: milestoneForm.description.trim(), dueDate: milestoneForm.dueDate || null };
      if (editingMilestone) {
        await axiosInstance.put(API_PATHS.PROJECTS.MILESTONE_UPDATE(id, editingMilestone._id), { ...payload, status: milestoneForm.status });
        toast.success("Milestone updated");
      } else {
        await axiosInstance.post(API_PATHS.PROJECTS.MILESTONES(id), payload);
        toast.success("Milestone added");
      }
      setMilestoneModal(false);
      fetchMilestones();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save milestone");
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (milestoneId) => {
    if (!window.confirm("Delete this milestone?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PROJECTS.MILESTONE_DELETE(id, milestoneId));
      toast.success("Milestone deleted");
      fetchMilestones();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const openTimeCreate = () => {
    setTimeForm({ taskId: "", hours: "", date: moment().format("YYYY-MM-DD"), description: "" });
    setTimeModal(true);
  };

  const saveTimeEntry = async (e) => {
    e.preventDefault();
    if (!timeForm.hours || Number(timeForm.hours) <= 0 || !timeForm.date) {
      toast.error("Hours and date are required");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.PROJECTS.TIME_ENTRIES, {
        projectId: id,
        taskId: timeForm.taskId || null,
        hours: Number(timeForm.hours),
        date: timeForm.date,
        description: timeForm.description.trim(),
      });
      toast.success("Time entry added");
      setTimeModal(false);
      fetchTimeEntries();
      fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save time entry");
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeEntry = async (entryId) => {
    if (!window.confirm("Delete this time entry?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PROJECTS.TIME_ENTRY_DELETE(entryId));
      toast.success("Time entry deleted");
      fetchTimeEntries();
      fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading || !project) {
    return (
      <div className="py-8">
        {!project && !loading && <p className="text-gray-500">Project not found.</p>}
        {loading && <p className="text-gray-500">Loading...</p>}
      </div>
    );
  }

  const tabs = [
    { id: "tasks", label: "Tasks", count: tasks.length },
    { id: "milestones", label: "Milestones", count: milestones.length },
    { id: "time", label: "Time entries", count: timeEntries.length },
  ];
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate("/projects")} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {statusLabels[project.status]} · {project.taskCount ?? 0} tasks · {(project.totalHours ?? 0).toFixed(1)}h logged
            {project.budgetAmount != null && ` · Budget: ${formatCurrency(project.budgetAmount, project.currency || "GHS")}`}
          </p>
        </div>
      </div>

      {project.description && <p className="text-gray-600 dark:text-gray-400 text-sm">{project.description}</p>}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-600 pb-2">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <div>
          <div className="flex justify-end mb-3">
            <Button onClick={openTaskCreate} size="small" className="flex items-center gap-1"><Plus className="w-4 h-4" /> Add task</Button>
          </div>
          <ul className="space-y-2">
            {tasks.length === 0 ? (
              <li className="text-gray-500 py-4 text-center">No tasks yet. Add one to get started.</li>
            ) : (
              tasks.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{taskStatusLabels[t.status]} · {priorityLabels[t.priority]}</span>
                    {t.assignee && <span className="ml-2 text-xs text-gray-500">→ {t.assignee.name}</span>}
                    {t.dueDate && <span className="ml-2 text-xs text-gray-500">Due {moment(t.dueDate).format("MMM D")}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openTaskEdit(t)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => deleteTask(t._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {activeTab === "milestones" && (
        <div>
          <div className="flex justify-end mb-3">
            <Button onClick={openMilestoneCreate} size="small" className="flex items-center gap-1"><Plus className="w-4 h-4" /> Add milestone</Button>
          </div>
          <ul className="space-y-2">
            {milestones.length === 0 ? (
              <li className="text-gray-500 py-4 text-center">No milestones yet.</li>
            ) : (
              milestones.map((m) => (
                <li key={m._id} className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center gap-2">
                    {m.status === "completed" ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> : <Target className="w-5 h-5 text-gray-400 shrink-0" />}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
                      {m.dueDate && <span className="ml-2 text-xs text-gray-500">Due {moment(m.dueDate).format("MMM D, YYYY")}</span>}
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${m.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{m.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openMilestoneEdit(m)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => deleteMilestone(m._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {activeTab === "time" && (
        <div>
          <div className="flex justify-end mb-3">
            <Button onClick={openTimeCreate} size="small" className="flex items-center gap-1"><Plus className="w-4 h-4" /> Log time</Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total: {totalHours.toFixed(1)} hours</p>
          <ul className="space-y-2">
            {timeEntries.length === 0 ? (
              <li className="text-gray-500 py-4 text-center">No time entries yet. Log time to track work.</li>
            ) : (
              timeEntries.map((e) => (
                <li key={e._id} className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{e.hours}h</span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{e.date ? moment(e.date).format("MMM D, YYYY") : ""}</span>
                    {e.task && <span className="ml-2 text-xs text-gray-500">· {e.task.name}</span>}
                    {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                  </div>
                  <button type="button" onClick={() => deleteTimeEntry(e._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {taskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingTask ? "Edit task" : "Add task"}</h3>
            <form onSubmit={saveTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={taskForm.name} onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={taskForm.status} onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  {Object.entries(taskStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
                <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to</label>
                <select value={taskForm.assignee} onChange={(e) => setTaskForm((f) => ({ ...f, assignee: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => <option key={m._id} value={m._id}>{m.name || m.email}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setTaskModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {milestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingMilestone ? "Edit milestone" : "Add milestone"}</h3>
            <form onSubmit={saveMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={milestoneForm.name} onChange={(e) => setMilestoneForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
                <input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              {editingMilestone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={milestoneForm.status} onChange={(e) => setMilestoneForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setMilestoneModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {timeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log time</h3>
            <form onSubmit={saveTimeEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task (optional)</label>
                <select value={timeForm.taskId} onChange={(e) => setTimeForm((f) => ({ ...f, taskId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="">— No task —</option>
                  {tasks.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours *</label>
                <input type="number" value={timeForm.hours} onChange={(e) => setTimeForm((f) => ({ ...f, hours: e.target.value }))} step="0.25" min="0.25" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input type="date" value={timeForm.date} onChange={(e) => setTimeForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={timeForm.description} onChange={(e) => setTimeForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setTimeModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Log time"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
