import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, Eye, Pencil, Trash2, X, BookOpen, ImagePlus } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const ExpendituresPage = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [expenditures, setExpenditures] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    date: moment().format("YYYY-MM-DD"),
    amount: "",
    expenseAccount: "",
    paymentAccount: "",
    description: "",
    vendor: "",
    paymentMethod: "",
    reference: "",
    receiptImage: "",
  });
  const [saving, setSaving] = useState(false);

  const compressImageAsDataUrl = (file, maxSize = 600, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.min(maxSize / w, maxSize / h, 1);
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        try {
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  };

  const handleReceiptImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageAsDataUrl(file);
      setForm((f) => ({ ...f, receiptImage: dataUrl }));
    } catch (err) {
      toast.error("Could not process image. Try a smaller file.");
    }
  };

  const expenseAccounts = accounts.filter((a) => a.type === "expense");

  const fetchExpenditures = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await axiosInstance.get(`${API_PATHS.ACCOUNTING.EXPENDITURES}?${params.toString()}`);
      setExpenditures(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load expenditures");
      setExpenditures([]);
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
    setLoading(true);
    Promise.all([fetchExpenditures(), fetchAccounts()]).finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const filtered = expenditures.filter((e) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const desc = (e.description || "").toLowerCase();
    const vendor = (e.vendor || "").toLowerCase();
    const ref = (e.reference || "").toLowerCase();
    const accName = (e.expenseAccount?.name || "").toLowerCase();
    return desc.includes(term) || vendor.includes(term) || ref.includes(term) || accName.includes(term);
  });

  const resetForm = () => setForm({
    date: moment().format("YYYY-MM-DD"),
    amount: "",
    expenseAccount: "",
    paymentAccount: "",
    description: "",
    vendor: "",
    paymentMethod: "",
    reference: "",
    receiptImage: "",
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) < 0 || !form.expenseAccount) {
      toast.error("Amount and expense account are required");
      return;
    }
    setSaving(true);
    try {
      const res = await axiosInstance.post(API_PATHS.ACCOUNTING.EXPENDITURES, {
        date: form.date,
        amount: Number(form.amount),
        expenseAccount: form.expenseAccount,
        paymentAccount: form.paymentAccount || undefined,
        description: form.description || undefined,
        vendor: form.vendor || undefined,
        paymentMethod: form.paymentMethod || undefined,
        reference: form.reference || undefined,
        receiptImage: form.receiptImage || undefined,
      });
      setExpenditures((prev) => [res.data, ...prev]);
      resetForm();
      setShowCreateModal(false);
      toast.success("Expenditure created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create expenditure");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem || !form.amount || Number(form.amount) < 0 || !form.expenseAccount) return;
    setSaving(true);
    try {
      const res = await axiosInstance.put(API_PATHS.ACCOUNTING.EXPENDITURE(editingItem._id), {
        date: form.date,
        amount: Number(form.amount),
        expenseAccount: form.expenseAccount,
        paymentAccount: form.paymentAccount || null,
        description: form.description || undefined,
        vendor: form.vendor || undefined,
        paymentMethod: form.paymentMethod || undefined,
        reference: form.reference || undefined,
        receiptImage: form.receiptImage ?? "",
      });
      setExpenditures((prev) => prev.map((x) => (x._id === editingItem._id ? res.data : x)));
      setEditingItem(null);
      resetForm();
      toast.success("Expenditure updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update expenditure");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (item.status === "recorded") {
      toast.error("Recorded expenditures cannot be deleted");
      return;
    }
    if (!window.confirm("Delete this expenditure?")) return;
    try {
      await axiosInstance.delete(API_PATHS.ACCOUNTING.EXPENDITURE(item._id));
      setExpenditures((prev) => prev.filter((x) => x._id !== item._id));
      setViewItem(null);
      setEditingItem(null);
      toast.success("Expenditure deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleRecordToLedger = async (item) => {
    if (item.status === "recorded") {
      toast.error("Already recorded in ledger");
      return;
    }
    try {
      const res = await axiosInstance.post(API_PATHS.ACCOUNTING.EXPENDITURE_RECORD_TO_LEDGER(item._id));
      setExpenditures((prev) => prev.map((x) => (x._id === item._id ? res.data : x)));
      if (viewItem?._id === item._id) setViewItem(res.data);
      toast.success("Expenditure recorded in ledger");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record to ledger");
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      date: moment(item.date).format("YYYY-MM-DD"),
      amount: item.amount,
      expenseAccount: item.expenseAccount?._id || item.expenseAccount || "",
      paymentAccount: item.paymentAccount?._id || item.paymentAccount || "",
      description: item.description || "",
      vendor: item.vendor || "",
      paymentMethod: item.paymentMethod || "",
      reference: item.reference || "",
      receiptImage: item.receiptImage || "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center flex-wrap no-print">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description, vendor, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-56 sm:w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
            <span className="text-gray-500">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 text-white">
          <Plus className="w-4 h-4" /> Add Expenditure
        </Button>
      </div>

      {loading && expenditures.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-gray-500">Loading expenditures...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expense Account</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No expenditures in this period. Add one to get started.</td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{moment(item.date).format("MMM D, YYYY")}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.description || item.vendor || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.expenseAccount?.code} — {item.expenseAccount?.name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.amount, userCurrency)}</td>
                      <td className="px-4 py-3 text-center">
                        {item.status === "recorded" ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Recorded</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Draft</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setViewItem(item)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400" title="View"><Eye className="w-4 h-4" /></button>
                          {item.status === "draft" && (
                            <>
                              <button type="button" onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400" title="Edit"><Pencil className="w-4 h-4" /></button>
                              <Button size="small" variant="secondary" onClick={() => handleRecordToLedger(item)} className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Record</Button>
                              <button type="button" onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-100 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 my-8">
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white">
              <h2 className="text-lg font-semibold text-white">Add Expenditure</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-slate-700 text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="0.00" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expense account</label><select value={form.expenseAccount} onChange={(e) => setForm((f) => ({ ...f, expenseAccount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required><option value="">Select</option>{expenseAccounts.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment from (e.g. Cash)</label><select value={form.paymentAccount} onChange={(e) => setForm((f) => ({ ...f, paymentAccount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"><option value="">Default (Cash 1000)</option>{accounts.filter((a) => a.type === "asset").map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="What was this for?" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Payee</label><input type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Optional" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment method</label><input type="text" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="e.g. Cash, Bank transfer" /></div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference / Receipt no</label>
                <div className="flex gap-2 min-w-0">
                  <input type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Text or receipt no" />
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 shrink-0">
                    <ImagePlus className="w-4 h-4" />
                    <span className="text-sm">Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleReceiptImageChange} />
                  </label>
                </div>
                {form.receiptImage && (
                  <div className="mt-2 flex items-center gap-2 min-w-0 overflow-hidden">
                    <img src={form.receiptImage} alt="Receipt" className="h-16 w-16 shrink-0 rounded border border-gray-200 dark:border-gray-600 object-cover" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, receiptImage: "" }))} className="text-sm text-red-600 hover:underline shrink-0">Remove</button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2"><Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 my-8">
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white"><h2 className="text-lg font-semibold text-white">Edit Expenditure</h2><button type="button" onClick={() => { setEditingItem(null); resetForm(); }} className="p-1 rounded hover:bg-slate-700 text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expense account</label><select value={form.expenseAccount} onChange={(e) => setForm((f) => ({ ...f, expenseAccount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required><option value="">Select</option>{expenseAccounts.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment from</label><select value={form.paymentAccount} onChange={(e) => setForm((f) => ({ ...f, paymentAccount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"><option value="">Default (Cash)</option>{accounts.filter((a) => a.type === "asset").map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Payee</label><input type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment method</label><input type="text" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" /></div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference / Receipt no</label>
                <div className="flex gap-2 min-w-0">
                  <input type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Text or receipt no" />
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 shrink-0">
                    <ImagePlus className="w-4 h-4" />
                    <span className="text-sm">Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleReceiptImageChange} />
                  </label>
                </div>
                {form.receiptImage && (
                  <div className="mt-2 flex items-center gap-2 min-w-0 overflow-hidden">
                    <img src={form.receiptImage} alt="Receipt" className="h-16 w-16 shrink-0 rounded border border-gray-200 dark:border-gray-600 object-cover" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, receiptImage: "" }))} className="text-sm text-red-600 hover:underline shrink-0">Remove</button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2"><Button type="button" variant="ghost" onClick={() => { setEditingItem(null); resetForm(); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Update"}</Button></div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewItem(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white"><h2 className="text-lg font-semibold text-white">Expenditure details</h2><button type="button" onClick={() => setViewItem(null)} className="p-1 rounded hover:bg-slate-700 text-white"><X className="w-5 h-5" /></button></div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-gray-500 dark:text-gray-400">Date</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{moment(viewItem.date).format("MMMM D, YYYY")}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Amount</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(viewItem.amount, userCurrency)}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Expense account</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{viewItem.expenseAccount?.code} — {viewItem.expenseAccount?.name || "—"}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Payment from</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{viewItem.paymentAccount ? `${viewItem.paymentAccount.code} — ${viewItem.paymentAccount.name}` : "Cash (default)"}</dd></div>
              {viewItem.description && <div><dt className="text-gray-500 dark:text-gray-400">Description</dt><dd className="text-gray-900 dark:text-gray-100">{viewItem.description}</dd></div>}
              {viewItem.vendor && <div><dt className="text-gray-500 dark:text-gray-400">Vendor / Payee</dt><dd className="text-gray-900 dark:text-gray-100">{viewItem.vendor}</dd></div>}
              {viewItem.paymentMethod && <div><dt className="text-gray-500 dark:text-gray-400">Payment method</dt><dd className="text-gray-900 dark:text-gray-100">{viewItem.paymentMethod}</dd></div>}
              {(viewItem.reference || viewItem.receiptImage) && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Reference / Receipt</dt>
                  <dd className="text-gray-900 dark:text-gray-100 mt-1">
                    {viewItem.reference && <span>{viewItem.reference}</span>}
                    {viewItem.receiptImage && (
                      <div className="mt-2">
                        <img src={viewItem.receiptImage} alt="Receipt" className="max-w-full max-h-48 rounded border border-gray-200 dark:border-gray-600 object-contain cursor-pointer" onClick={() => window.open(viewItem.receiptImage, "_blank")} title="Click to enlarge" />
                      </div>
                    )}
                  </dd>
                </div>
              )}
              <div><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><span className={viewItem.status === "recorded" ? "text-emerald-600" : "text-amber-600"}>{viewItem.status === "recorded" ? "Recorded in ledger" : "Draft"}</span></dd></div>
              {viewItem.journalEntry && <div><dt className="text-gray-500 dark:text-gray-400">Journal entry</dt><dd className="text-gray-900 dark:text-gray-100">{viewItem.journalEntry?.entryNumber || viewItem.journalEntry}</dd></div>}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              {viewItem.status === "draft" && (
                <>
                  <Button variant="secondary" size="small" onClick={() => { setViewItem(null); openEdit(viewItem); }}>Edit</Button>
                  <Button size="small" onClick={() => handleRecordToLedger(viewItem)} className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Record to ledger</Button>
                  <Button variant="ghost" size="small" onClick={() => handleDelete(viewItem)} className="text-red-600">Delete</Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">Track expenses here. Use &quot;Record to ledger&quot; to create a posted journal entry (Debit expense, Credit cash) so they appear in P&amp;L and reports.</p>
    </div>
  );
};

export default ExpendituresPage;
