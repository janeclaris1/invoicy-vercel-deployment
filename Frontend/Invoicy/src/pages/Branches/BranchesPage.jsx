import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Users,
  Loader2,
  X,
  Building2,
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const BranchesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    tin: "",
    isDefault: false,
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [viewEmployeesId, setViewEmployeesId] = useState(null);
  const [branchEmployees, setBranchEmployees] = useState([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.BRANCHES.GET_DASHBOARD);
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      tin: "",
      isDefault: false,
      status: "active",
    });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingId(b._id);
    setForm({
      name: b.name || "",
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
      tin: b.tin || "",
      isDefault: !!b.isDefault,
      status: b.status || "active",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axiosInstance.put(API_PATHS.BRANCHES.UPDATE(editingId), form);
        toast.success("Branch updated");
      } else {
        await axiosInstance.post(API_PATHS.BRANCHES.CREATE, form);
        toast.success("Branch created");
      }
      setShowModal(false);
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this branch? Employees will be unassigned from this branch.")) return;
    try {
      await axiosInstance.delete(API_PATHS.BRANCHES.DELETE(id));
      toast.success("Branch deleted");
      fetchDashboard();
      if (viewEmployeesId === id) setViewEmployeesId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete branch");
    }
  };

  const loadBranchEmployees = async (id) => {
    if (viewEmployeesId === id) {
      setViewEmployeesId(null);
      return;
    }
    try {
      const res = await axiosInstance.get(API_PATHS.BRANCHES.GET_EMPLOYEES(id));
      setBranchEmployees(Array.isArray(res.data) ? res.data : []);
      setViewEmployeesId(id);
    } catch {
      toast.error("Failed to load employees");
      setViewEmployeesId(null);
    }
  };

  const isOwnerOrAdmin = ["owner", "admin"].includes(user?.role || "");

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Branches
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage branch locations. Assign employees and filter invoices by branch.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add branch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div
            key={b._id}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {b.name}
                    {b.isDefault && (
                      <span className="ml-1 text-xs text-emerald-600 font-normal">(Default)</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{b.status}</p>
                </div>
              </div>
              {isOwnerOrAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b._id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {b.address && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{b.address}</p>
            )}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4" />
                {b.invoiceCount ?? 0} invoices
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                {b.employeeCount ?? 0} employees
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="small"
                onClick={() => loadBranchEmployees(b._id)}
                className="text-sm"
              >
                {viewEmployeesId === b._id ? "Hide employees" : "View employees"}
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={() => navigate(`/invoices?branch=${b._id}`)}
                className="text-sm"
              >
                View invoices
              </Button>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No branches yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Add branches in Settings → Company or click Add branch above.
          </p>
          <Button onClick={() => navigate("/settings")} className="mt-4">
            Go to Settings
          </Button>
        </div>
      )}

      {viewEmployeesId && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Employees at this branch</h3>
          {branchEmployees.length === 0 ? (
            <p className="text-sm text-gray-500">No employees assigned to this branch.</p>
          ) : (
            <ul className="space-y-2">
              {branchEmployees.map((emp) => (
                <li
                  key={emp._id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
                >
                  <span className="text-gray-900 dark:text-white">
                    {emp.firstName} {emp.lastName}
                    {emp.position && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                        — {emp.position}
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => navigate("/hr/records", { state: { highlightEmployeeId: emp._id } })}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-3">
            Assign employees to this branch from HR → Employee Data & Records (edit employee and set Branch).
          </p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? "Edit branch" : "Add branch"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="e.g. Accra Office"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Branch address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="branch@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TIN (Tax ID)
                </label>
                <input
                  type="text"
                  value={form.tin}
                  onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="branchDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <label
                  htmlFor="branchDefault"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Set as default branch for new invoices
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;
