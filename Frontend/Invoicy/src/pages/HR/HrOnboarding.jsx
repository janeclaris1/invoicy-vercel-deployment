import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, User, Calendar, CheckCircle, Clock } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";

const ONBOARDING_CATEGORIES = ["Documentation", "IT Setup", "HR Forms", "Orientation", "Training", "Equipment", "Other"];
const OFFBOARDING_CATEGORIES = ["Documentation", "IT Deactivation", "HR Forms", "Exit Interview", "Asset Return", "Final Payroll", "Other"];
const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const HrOnboarding = () => {
  const [activeTab, setActiveTab] = useState("onboarding");
  const [employees, setEmployees] = useState([]);
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [offboardingTasks, setOffboardingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    title: "",
    description: "",
    category: "Other",
    dueDate: "",
    status: "Pending",
    priority: "Medium",
    notes: "",
    exitDate: "",
    exitReason: "",
    exitInterviewNotes: "",
  });

  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.EMPLOYEES.GET_ALL);
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
      setEmployees([]);
    }
  };

  const fetchOnboardingTasks = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HR_TASKS.ONBOARDING);
      setOnboardingTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load onboarding tasks");
      setOnboardingTasks([]);
    }
  };

  const fetchOffboardingTasks = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HR_TASKS.OFFBOARDING);
      setOffboardingTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load offboarding tasks");
      setOffboardingTasks([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchOnboardingTasks(), fetchOffboardingTasks()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetForm = () => {
    setFormData({
      employeeId: "",
      title: "",
      description: "",
      category: "Other",
      dueDate: "",
      status: "Pending",
      priority: "Medium",
      notes: "",
      exitDate: "",
      exitReason: "",
      exitInterviewNotes: "",
    });
    setEditingTask(null);
  };

  const openAdd = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, employeeId: filterEmployeeId || (employees[0]?._id || "") }));
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    const empId = task.employee?._id || task.employee;
    setFormData({
      employeeId: empId,
      title: task.title || "",
      description: task.description || "",
      category: task.category || "Other",
      dueDate: task.dueDate ? moment(task.dueDate).format("YYYY-MM-DD") : "",
      status: task.status || "Pending",
      priority: task.priority || "Medium",
      notes: task.notes || "",
      exitDate: task.exitDate ? moment(task.exitDate).format("YYYY-MM-DD") : "",
      exitReason: task.exitReason || "",
      exitInterviewNotes: task.exitInterviewNotes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === "onboarding") {
        if (editingTask) {
          await axiosInstance.put(API_PATHS.HR_TASKS.ONBOARDING_BY_ID(editingTask._id), {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            dueDate: formData.dueDate || null,
            status: formData.status,
            priority: formData.priority,
            notes: formData.notes,
          });
          toast.success("Onboarding task updated");
        } else {
          await axiosInstance.post(API_PATHS.HR_TASKS.ONBOARDING, {
            employeeId: formData.employeeId,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            dueDate: formData.dueDate || null,
            status: formData.status,
            priority: formData.priority,
            notes: formData.notes,
          });
          toast.success("Onboarding task added");
        }
        await fetchOnboardingTasks();
      } else {
        if (editingTask) {
          await axiosInstance.put(API_PATHS.HR_TASKS.OFFBOARDING_BY_ID(editingTask._id), {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            dueDate: formData.dueDate || null,
            status: formData.status,
            priority: formData.priority,
            notes: formData.notes,
            exitDate: formData.exitDate || null,
            exitReason: formData.exitReason,
            exitInterviewNotes: formData.exitInterviewNotes,
          });
          toast.success("Offboarding task updated");
        } else {
          await axiosInstance.post(API_PATHS.HR_TASKS.OFFBOARDING, {
            employeeId: formData.employeeId,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            dueDate: formData.dueDate || null,
            status: formData.status,
            priority: formData.priority,
            notes: formData.notes,
            exitDate: formData.exitDate || null,
            exitReason: formData.exitReason,
            exitInterviewNotes: formData.exitInterviewNotes,
          });
          toast.success("Offboarding task added");
        }
        await fetchOffboardingTasks();
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task");
    }
  };

  const handleDelete = async (task, type) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      if (type === "onboarding") {
        await axiosInstance.delete(API_PATHS.HR_TASKS.ONBOARDING_BY_ID(task._id));
        setOnboardingTasks((prev) => prev.filter((t) => t._id !== task._id));
      } else {
        await axiosInstance.delete(API_PATHS.HR_TASKS.OFFBOARDING_BY_ID(task._id));
        setOffboardingTasks((prev) => prev.filter((t) => t._id !== task._id));
      }
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const tasks = activeTab === "onboarding" ? onboardingTasks : offboardingTasks;
  const filteredTasks = tasks.filter((task) => {
    const emp = task.employee;
    const name = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase() : "";
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || (emp?.employeeId || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmployee = !filterEmployeeId || (emp?._id || task.employee) === filterEmployeeId;
    return matchSearch && matchEmployee;
  });

  const getEmployeeName = (task) => {
    const emp = task.employee;
    if (!emp) return "Unknown";
    return `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeId || "Unknown";
  };

  const statusColor = (status) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "In Progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Overdue": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Onboarding & Offboarding</h1>
          <p className="text-gray-600 dark:text-slate-400">Manage employee onboarding and offboarding workflows.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shrink-0 border border-blue-800"
        >
          <Plus className="w-5 h-5" /> Add task
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab("onboarding")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "onboarding" ? "bg-blue-900 text-white" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
          >
            Onboarding
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("offboarding")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "offboarding" ? "bg-blue-900 text-white" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
          >
            Offboarding
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterEmployeeId}
          onChange={(e) => setFilterEmployeeId(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="">All employees</option>
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 py-8">No {activeTab} tasks yet. Add a task to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-900 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{getEmployeeName(task)}</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{task.employee?.employeeId || ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(task)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task, activeTab)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">{task.title}</h4>
                  {task.description && <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor(task.status)}`}>
                      {task.status === "Completed" ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {task.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">{task.category}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">{task.priority}</span>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      Due {moment(task.dueDate).format("MMM D, YYYY")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingTask ? "Edit task" : "Add task"} ({activeTab})
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {(activeTab === "onboarding" ? ONBOARDING_CATEGORIES : OFFBOARDING_CATEGORIES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Due date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              {activeTab === "offboarding" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Exit date</label>
                    <input
                      type="date"
                      value={formData.exitDate}
                      onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Exit reason</label>
                    <input
                      type="text"
                      value={formData.exitReason}
                      onChange={(e) => setFormData({ ...formData, exitReason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Exit interview notes</label>
                    <textarea
                      value={formData.exitInterviewNotes}
                      onChange={(e) => setFormData({ ...formData, exitInterviewNotes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 border border-blue-800">
                  {editingTask ? "Save changes" : "Add task"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300">
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

export default HrOnboarding;
