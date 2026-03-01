import React, { useState, useEffect } from "react";
import { Plus, Eye, Pencil, Trash2, X, FileText } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const BillsPage = () => {
  const { user } = useAuth();
  const currency = user?.currency || "GHS";
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    vendorName: "",
    vendorEmail: "",
    vendorAddress: "",
    billDate: moment().format("YYYY-MM-DD"),
    dueDate: "",
    lineItems: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.BILLS + params);
      setBills(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load bills");
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const recalcForm = () => {
    const lines = form.lineItems || [];
    let subtotal = 0;
    lines.forEach((l) => {
      const amt = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      subtotal += amt;
    });
    const tax = Number(form.taxAmount) || 0;
    setForm((f) => ({
      ...f,
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      vendorName: "",
      vendorEmail: "",
      vendorAddress: "",
      billDate: moment().format("YYYY-MM-DD"),
      dueDate: "",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (bill) => {
    setEditing(bill);
    setForm({
      vendorName: bill.vendorName || "",
      vendorEmail: bill.vendorEmail || "",
      vendorAddress: bill.vendorAddress || "",
      billDate: bill.billDate ? moment(bill.billDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      dueDate: bill.dueDate ? moment(bill.dueDate).format("YYYY-MM-DD") : "",
      lineItems: (bill.lineItems && bill.lineItems.length) ? bill.lineItems.map((l) => ({ ...l })) : [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
      subtotal: bill.subtotal || 0,
      taxAmount: bill.taxAmount || 0,
      total: bill.total || 0,
      notes: bill.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vendorName.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    const lines = (form.lineItems || []).map((l) => ({
      description: l.description || "",
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      amount: (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    }));
    const total = form.total || (form.subtotal || 0) + (form.taxAmount || 0);
    setSaving(true);
    try {
      const payload = {
        vendorName: form.vendorName.trim(),
        vendorEmail: form.vendorEmail.trim(),
        vendorAddress: form.vendorAddress.trim(),
        billDate: form.billDate,
        dueDate: form.dueDate || null,
        lineItems: lines,
        subtotal: form.subtotal || 0,
        taxAmount: form.taxAmount || 0,
        total,
        notes: form.notes || "",
      };
      if (editing) {
        await axiosInstance.put(API_PATHS.ACCOUNTING.BILL(editing._id), payload);
        toast.success("Bill updated");
      } else {
        await axiosInstance.post(API_PATHS.ACCOUNTING.BILLS, payload);
        toast.success("Bill created");
      }
      setShowModal(false);
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bill) => {
    if (bill.status === "paid") {
      toast.error("Paid bills cannot be deleted");
      return;
    }
    if (!window.confirm("Delete this bill?")) return;
    try {
      await axiosInstance.delete(API_PATHS.ACCOUNTING.BILL(bill._id));
      toast.success("Bill deleted");
      fetchBills();
      if (viewing && viewing._id === bill._id) setViewing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const addLine = () => {
    setForm((f) => ({
      ...f,
      lineItems: [...(f.lineItems || []), { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    }));
  };

  const updateLine = (index, field, value) => {
    setForm((f) => {
      const lines = [...(f.lineItems || [])];
      lines[index] = { ...lines[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        lines[index].amount = (Number(lines[index].quantity) || 0) * (Number(lines[index].unitPrice) || 0);
      }
      return { ...f, lineItems: lines };
    });
    setTimeout(recalcForm, 0);
  };

  const removeLine = (index) => {
    if ((form.lineItems || []).length <= 1) return;
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.filter((_, i) => i !== index),
    }));
    setTimeout(recalcForm, 0);
  };

  useEffect(() => {
    recalcForm();
  }, [form.lineItems]);

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    open: "bg-amber-100 text-amber-800",
    partial: "bg-blue-100 text-blue-800",
    paid: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bills (Accounts Payable)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vendor bills to be paid</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Bill
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8">Loading...</p>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Bill #</th>
                <th className="px-4 py-3 text-left font-medium">Vendor</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No bills yet. Click Add Bill to create one.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{bill.billNumber}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{bill.vendorName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{bill.billDate ? moment(bill.billDate).format("MMM D, YYYY") : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(bill.total, bill.currency || currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[bill.status] || "bg-gray-100 text-gray-800"}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setViewing(bill)} className="p-1.5 text-gray-600 hover:bg-gray-200 dark:hover:bg-slate-600 rounded" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {bill.status !== "paid" && (
                        <button type="button" onClick={() => openEdit(bill)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-600 rounded" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => handleDelete(bill)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-600 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewing(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{viewing.billNumber}</h3>
              <button type="button" onClick={() => setViewing(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Vendor</dt><dd className="font-medium text-gray-900 dark:text-white">{viewing.vendorName}</dd></div>
              <div><dt className="text-gray-500">Date</dt><dd>{viewing.billDate ? moment(viewing.billDate).format("MMM D, YYYY") : "—"}</dd></div>
              <div><dt className="text-gray-500">Due</dt><dd>{viewing.dueDate ? moment(viewing.dueDate).format("MMM D, YYYY") : "—"}</dd></div>
              <div><dt className="text-gray-500">Total</dt><dd className="font-medium">{formatCurrency(viewing.total, viewing.currency || currency)}</dd></div>
              <div><dt className="text-gray-500">Status</dt><dd><span className={`px-2 py-0.5 rounded text-xs ${statusColors[viewing.status] || ""}`}>{viewing.status}</span></dd></div>
              {viewing.notes && <div><dt className="text-gray-500">Notes</dt><dd>{viewing.notes}</dd></div>}
            </dl>
            {viewing.status !== "paid" && (
              <Button variant="ghost" size="small" onClick={() => { setViewing(null); openEdit(viewing); }} className="mt-4">Edit</Button>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit Bill" : "Add Bill"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor name *</label>
                  <input type="text" value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bill date</label>
                  <input type="date" value={form.billDate} onChange={(e) => setForm((f) => ({ ...f, billDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</label>
                  <Button type="button" variant="ghost" size="small" onClick={addLine}>+ Add line</Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(form.lineItems || []).map((line, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" placeholder="Description" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 border rounded text-sm" />
                      <input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} className="w-16 px-2 py-1.5 border rounded text-sm" min="0" step="1" />
                      <input type="number" placeholder="Price" value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", e.target.value)} className="w-24 px-2 py-1.5 border rounded text-sm" min="0" step="0.01" />
                      <span className="w-20 text-right text-sm">{formatCurrency((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), currency)}</span>
                      <button type="button" onClick={() => removeLine(i)} className="p-1 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 justify-end">
                <label className="text-sm text-gray-600">Tax amount</label>
                <input type="number" value={form.taxAmount} onChange={(e) => { setForm((f) => ({ ...f, taxAmount: e.target.value })); setTimeout(recalcForm, 0); }} className="w-28 px-2 py-1.5 border rounded text-sm" min="0" step="0.01" />
              </div>
              <div className="text-right font-medium text-gray-900 dark:text-white">Total: {formatCurrency(form.total || 0, currency)}</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
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

export default BillsPage;
