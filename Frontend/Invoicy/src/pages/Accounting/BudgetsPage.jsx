import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Target } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";

const currentYear = new Date().getFullYear();

const BudgetsPage = () => {
  const { user } = useAuth();
  const currency = user?.currency || "GHS";
  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    account: "",
    periodType: "yearly",
    periodYear: currentYear,
    periodMonth: "",
    amount: "",
  });
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [saving, setSaving] = useState(false);

  const fetchBudgets = async () => {
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.set("periodYear", yearFilter);
      const res = await axiosInstance.get(`${API_PATHS.ACCOUNTING.BUDGETS}?${params.toString()}`);
      setBudgets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load budgets");
      setBudgets([]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.ACCOUNTS);
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAccounts([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchBudgets(), fetchAccounts()]);
      setLoading(false);
    };
    load();
  }, [yearFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      account: "",
      periodType: "yearly",
      periodYear: currentYear,
      periodMonth: "",
      amount: "",
    });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      account: b.account?._id || b.account || "",
      periodType: b.periodType || "yearly",
      periodYear: b.periodYear || currentYear,
      periodMonth: b.periodMonth != null ? b.periodMonth : "",
      amount: b.amount ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.account || form.amount === "" || form.amount == null) {
      toast.error("Account and amount are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        account: form.account,
        periodType: form.periodType,
        periodYear: Number(form.periodYear),
        periodMonth: form.periodMonth !== "" ? Number(form.periodMonth) : null,
        amount: Number(form.amount),
        currency,
      };
      if (editing) {
        await axiosInstance.put(API_PATHS.ACCOUNTING.BUDGET(editing._id), { amount: payload.amount, periodType: payload.periodType, periodMonth: payload.periodMonth });
        toast.success("Budget updated");
      } else {
        await axiosInstance.post(API_PATHS.ACCOUNTING.BUDGETS, payload);
        toast.success("Budget created");
      }
      setShowModal(false);
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await axiosInstance.delete(API_PATHS.ACCOUNTING.BUDGET(id));
      toast.success("Budget deleted");
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5" /> Budgets
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set planned amounts per account for the year</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Year</label>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            {[currentYear + 1, currentYear, currentYear - 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add budget</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Account</th>
              <th className="px-4 py-3 text-left font-medium">Period</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No budgets for this year. Add one to track planned spending.</td>
              </tr>
            ) : (
              budgets.map((b) => (
                <tr key={b._id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">{b.account?.code || "—"}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">{b.account?.name || ""}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {b.periodYear}
                    {b.periodMonth != null ? ` (Month ${b.periodMonth})` : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(b.amount, b.currency || currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(b)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-600"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => handleDelete(b._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-600"><Trash2 className="w-4 h-4" /></button>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit budget" : "Add budget"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account *</label>
                <select value={form.account} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required>
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year *</label>
                    <input type="number" value={form.periodYear} onChange={(e) => setForm((f) => ({ ...f, periodYear: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" min={currentYear - 5} max={currentYear + 5} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period type</label>
                    <select value={form.periodType} onChange={(e) => setForm((f) => ({ ...f, periodType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                      <option value="yearly">Yearly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  {form.periodType === "monthly" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month (1-12)</label>
                      <input type="number" value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" min="1" max="12" placeholder="Optional" />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" step="0.01" min="0" required />
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

export default BudgetsPage;
