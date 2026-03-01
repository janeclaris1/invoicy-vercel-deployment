import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Package, CheckCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const statusLabels = { draft: "Draft", sent: "Sent", partial: "Partial", received: "Received", cancelled: "Cancelled" };

const ProcurementPage = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [receiveModal, setReceiveModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    orderNumber: "",
    supplierId: "",
    warehouseId: "",
    orderDate: moment().format("YYYY-MM-DD"),
    expectedDate: "",
    notes: "",
    lines: [{ item: "", quantity: 1, unitPrice: 0, unit: "" }],
  });
  const [receiveLines, setReceiveLines] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDERS + params);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load POs");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.SUPPLIERS);
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSuppliers([]);
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

  const fetchWarehouses = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.WAREHOUSES);
      setWarehouses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setWarehouses([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);
  useEffect(() => {
    fetchSuppliers();
    fetchItems();
    fetchWarehouses();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      orderNumber: `PO-${Date.now()}`,
      supplierId: suppliers[0]?._id || "",
      warehouseId: "",
      orderDate: moment().format("YYYY-MM-DD"),
      expectedDate: "",
      notes: "",
      lines: [{ item: items[0]?._id || "", quantity: 1, unitPrice: 0, unit: "unit" }],
    });
    setShowModal(true);
  };

  const openEdit = (po) => {
    setEditing(po);
    setForm({
      orderNumber: po.orderNumber || "",
      supplierId: po.supplier?._id || po.supplier || "",
      warehouseId: po.warehouse?._id || po.warehouse || "",
      orderDate: po.orderDate ? moment(po.orderDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      expectedDate: po.expectedDate ? moment(po.expectedDate).format("YYYY-MM-DD") : "",
      notes: po.notes || "",
      lines: (po.lines || []).map((l) => ({
        _id: l._id,
        item: l.item?._id || l.item,
        quantity: l.quantity,
        unitPrice: l.unitPrice || 0,
        unit: l.unit || "unit",
      })),
    });
    if (!form.lines?.length) setForm((f) => ({ ...f, lines: [{ item: items[0]?._id || "", quantity: 1, unitPrice: 0, unit: "unit" }] }));
    setShowModal(true);
  };

  const openReceive = (po) => {
    setReceiveModal(po);
    setReceiveLines((po.lines || []).map((l) => ({ lineId: l._id, quantityReceived: (l.quantity || 0) - (l.quantityReceived || 0) })));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.orderNumber.trim() || !form.supplierId) {
      toast.error("Order number and supplier are required");
      return;
    }
    const lines = (form.lines || []).filter((l) => l.item && Number(l.quantity) > 0);
    if (!lines.length) {
      toast.error("Add at least one line");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        orderNumber: form.orderNumber.trim(),
        supplierId: form.supplierId,
        warehouseId: form.warehouseId || null,
        orderDate: form.orderDate,
        expectedDate: form.expectedDate || null,
        notes: form.notes.trim(),
        lines: lines.map((l) => ({ item: l.item, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0, unit: l.unit || "unit" })),
      };
      if (editing) {
        await axiosInstance.put(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDER(editing._id), payload);
        toast.success("PO updated");
      } else {
        await axiosInstance.post(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDERS, payload);
        toast.success("PO created");
      }
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    if (!receiveModal) return;
    const lines = receiveLines.filter((l) => Number(l.quantityReceived) > 0).map((l) => ({ lineId: l.lineId, quantityReceived: Number(l.quantityReceived) }));
    if (!lines.length) {
      toast.error("Enter quantities to receive");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDER_RECEIVE(receiveModal._id), { lines });
      toast.success("Stock received");
      setReceiveModal(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to receive");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (po) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await axiosInstance.delete(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDER(po._id));
      toast.success("PO deleted");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...(f.lines || []), { item: items[0]?._id || "", quantity: 1, unitPrice: 0, unit: "unit" }] }));
  const updateLine = (index, field, value) => {
    setForm((f) => ({
      ...f,
      lines: (f.lines || []).map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }));
  };
  const removeLine = (index) => setForm((f) => ({ ...f, lines: (f.lines || []).filter((_, i) => i !== index) }));

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase orders</h2>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> New PO</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">PO #</th>
              <th className="px-4 py-3 text-left font-medium">Supplier</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Expected</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No purchase orders. Create one to start procurement.</td></tr>
            ) : (
              orders.map((po) => (
                <tr key={po._id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{po.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{po.supplier?.name || po.supplier?.company || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(po.totalAmount, po.currency || "GHS")}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-slate-700">{statusLabels[po.status] || po.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{po.expectedDate ? moment(po.expectedDate).format("MMM D, YYYY") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {po.status !== "received" && po.status !== "cancelled" && (
                      <button type="button" onClick={() => openReceive(po)} className="p-1.5 text-emerald-600 rounded hover:bg-emerald-50 dark:hover:bg-slate-700 mr-1" title="Receive"><CheckCircle className="w-4 h-4 inline" /></button>
                    )}
                    {po.status !== "received" && (
                      <>
                        <button type="button" onClick={() => openEdit(po)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 inline" /></button>
                        <button type="button" onClick={() => handleDelete(po)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 inline" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit PO" : "New purchase order"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO number *</label>
                  <input type="text" value={form.orderNumber} onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier *</label>
                  <select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse (optional)</label>
                <select value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="">— None —</option>
                  {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order date</label>
                  <input type="date" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected date</label>
                  <input type="date" value={form.expectedDate} onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lines</label>
                  <Button type="button" variant="ghost" size="small" onClick={addLine}>+ Add line</Button>
                </div>
                {(form.lines || []).map((line, i) => (
                  <div key={i} className="flex gap-2 items-end mb-2">
                    <select value={line.item} onChange={(e) => updateLine(i, "item", e.target.value)} className="flex-1 px-2 py-1.5 border rounded bg-white dark:bg-slate-800 text-sm" required>
                      <option value="">Item</option>
                      {items.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
                    </select>
                    <input type="number" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} min={1} className="w-20 px-2 py-1.5 border rounded text-sm" />
                    <input type="number" value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", e.target.value)} min={0} step="0.01" className="w-24 px-2 py-1.5 border rounded text-sm" />
                    <button type="button" onClick={() => removeLine(i)} className="p-1.5 text-red-600">×</button>
                  </div>
                ))}
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

      {receiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receive: {receiveModal.orderNumber}</h3>
            <form onSubmit={handleReceive} className="space-y-4">
              {(receiveModal.lines || []).map((line) => {
                const pending = (line.quantity || 0) - (line.quantityReceived || 0);
                const rec = receiveLines.find((r) => r.lineId === line._id);
                const val = rec ? rec.quantityReceived : pending;
                return (
                  <div key={line._id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{line.item?.name} — receive (max {pending})</label>
                    <input
                      type="number"
                      min={0}
                      max={pending}
                      value={val}
                      onChange={(e) => setReceiveLines((prev) => prev.map((r) => (r.lineId === line._id ? { ...r, quantityReceived: e.target.value } : r)))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                );
              })}
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setReceiveModal(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Receiving..." : "Receive"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementPage;
