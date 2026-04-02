import React, { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatCurrency } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";

const SupplyChainSuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    country: "",
    taxId: "",
    category: "",
    notes: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const [supRes, poRes] = await Promise.all([
        axiosInstance.get(API_PATHS.SUPPLY_CHAIN.SUPPLIERS),
        axiosInstance.get(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDERS),
      ]);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setPurchaseOrders(Array.isArray(poRes.data) ? poRes.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load suppliers");
      setSuppliers([]);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const supplierTotals = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => {
      const sid = String(s._id);
      const pos = purchaseOrders.filter((po) => poSupplierId(po) === sid);
      const totalValue = pos.reduce((sum, po) => sum + toNumber(po.totalAmount), 0);
      const openPOs = pos.filter((po) => ["draft", "sent", "partial"].includes((po.status || "").toLowerCase())).length;
      map[sid] = { poCount: pos.length, totalValue, openPOs };
    });
    return map;
  }, [suppliers, purchaseOrders]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", company: "", address: "", city: "", country: "", taxId: "", category: "", notes: "", isActive: true });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      email: s.email || "",
      phone: s.phone || "",
      company: s.company || "",
      address: s.address || "",
      city: s.city || "",
      country: s.country || "",
      taxId: s.taxId || "",
      category: s.category || "",
      notes: s.notes || "",
      isActive: s.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await axiosInstance.put(API_PATHS.SUPPLY_CHAIN.SUPPLIER(editing._id), form);
        toast.success("Supplier updated");
      } else {
        await axiosInstance.post(API_PATHS.SUPPLY_CHAIN.SUPPLIERS, form);
        toast.success("Supplier created");
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await axiosInstance.delete(API_PATHS.SUPPLY_CHAIN.SUPPLIER(s._id));
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-800 px-4 py-3 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Suppliers</h2>
        <Button onClick={openCreate} variant="whiteOutline" className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add supplier</Button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Email / Phone</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">POs</th>
              <th className="px-4 py-3 text-left font-medium">Account</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {suppliers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No suppliers. Add one for procurement.</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s._id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.company || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.email || "—"} {s.phone ? ` · ${s.phone}` : ""}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.category || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {supplierTotals[String(s._id)]?.poCount ?? 0}
                    {supplierTotals[String(s._id)]?.openPOs ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
                        ({supplierTotals[String(s._id)].openPOs} open)
                      </span>
                    ) : null}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(supplierTotals[String(s._id)]?.totalValue ?? 0, userCurrency)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/supply-chain/suppliers/${s._id}`)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View account
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(s)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 inline" /></button>
                    <button type="button" onClick={() => handleDelete(s)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-700"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? "Edit supplier" : "Add supplier"}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label><input type="text" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label><input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label><input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label><input type="text" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label><input type="text" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" /></div>
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
}

export default SupplyChainSuppliersPage;
