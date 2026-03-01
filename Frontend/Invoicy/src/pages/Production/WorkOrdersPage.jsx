import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";

const statusLabels = { draft: "Draft", scheduled: "Scheduled", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

const WorkOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    orderNumber: "",
    product: "",
    quantity: 1,
    dueDate: "",
    startDate: "",
    status: "draft",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.PRODUCTION.WORK_ORDERS + params);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load work orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);
  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      orderNumber: `WO-${Date.now()}`,
      product: items[0]?._id || "",
      quantity: 1,
      dueDate: "",
      startDate: "",
      status: "draft",
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (order) => {
    setEditing(order);
    setForm({
      orderNumber: order.orderNumber || "",
      product: order.product?._id || order.product || "",
      quantity: order.quantity ?? 1,
      dueDate: order.dueDate ? moment(order.dueDate).format("YYYY-MM-DD") : "",
      startDate: order.startDate ? moment(order.startDate).format("YYYY-MM-DD") : "",
      status: order.status || "draft",
      notes: order.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.orderNumber.trim() || !form.product || form.quantity < 1) {
      toast.error("Order number, product, and quantity are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        orderNumber: form.orderNumber.trim(),
        product: form.product,
        quantity: Number(form.quantity),
        dueDate: form.dueDate || null,
        startDate: form.startDate || null,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editing) {
        await axiosInstance.put(API_PATHS.PRODUCTION.WORK_ORDER(editing._id), payload);
        toast.success("Work order updated");
      } else {
        await axiosInstance.post(API_PATHS.PRODUCTION.WORK_ORDERS, payload);
        toast.success("Work order created");
      }
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Delete work order "${order.orderNumber}"?`)) return;
    try {
      await axiosInstance.delete(API_PATHS.PRODUCTION.WORK_ORDER(order._id));
      toast.success("Work order deleted");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Work Orders</h2>
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
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> New Work Order</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order #</th>
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Due date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No work orders yet. Create one to get started.</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{o.product?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">{o.quantityProduced != null ? `${o.quantityProduced} / ${o.quantity}` : o.quantity}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-slate-700">{statusLabels[o.status] || o.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.dueDate ? moment(o.dueDate).format("MMM D, YYYY") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(o)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 inline" /></button>
                    <button type="button" onClick={() => handleDelete(o)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 inline" /></button>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit work order" : "New work order"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order number *</label>
                <input type="text" value={form.orderNumber} onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product *</label>
                <select value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required>
                  <option value="">Select product</option>
                  {items.map((i) => <option key={i._id} value={i._id}>{i.name}{i.sku ? ` (${i.sku})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} min={1} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
              </div>
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

export default WorkOrdersPage;
