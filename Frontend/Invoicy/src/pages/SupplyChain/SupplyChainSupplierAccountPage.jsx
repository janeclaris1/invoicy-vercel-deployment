import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ClipboardList, Loader2, Mail, MapPin, Phone, Truck } from "lucide-react";
import moment from "moment";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatCurrency } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
  return 0;
};

const poSupplierId = (po) => String(po?.supplier?._id || po?.supplier || "");

const SupplyChainSupplierAccountPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";

  const [supplier, setSupplier] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [accountNotes, setAccountNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [supRes, poRes] = await Promise.all([
          axiosInstance.get(API_PATHS.SUPPLY_CHAIN.SUPPLIER(id)),
          axiosInstance.get(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDERS),
        ]);
        setSupplier(supRes.data || null);
        setPurchaseOrders(Array.isArray(poRes.data) ? poRes.data : []);
      } catch (_) {
        setSupplier(null);
        setPurchaseOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const allNotes = JSON.parse(localStorage.getItem("supplySupplierAccountNotes") || "{}");
    const notes = Array.isArray(allNotes[String(id)]) ? allNotes[String(id)] : [];
    setAccountNotes(notes);
  }, [id]);

  const supplierPOs = useMemo(
    () => purchaseOrders.filter((po) => poSupplierId(po) === String(id)),
    [purchaseOrders, id]
  );

  const filteredPOs = useMemo(() => {
    const now = new Date();
    let cutoff = null;
    if (dateFilter === "30d") cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateFilter === "90d") cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (dateFilter === "365d") cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    return supplierPOs.filter((po) => {
      const st = (po.status || "").toLowerCase();
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "open" && ["draft", "sent", "partial"].includes(st)) ||
        (statusFilter === "received" && st === "received") ||
        (statusFilter === "cancelled" && st === "cancelled");

      if (!statusMatches) return false;
      if (!cutoff) return true;
      const d = po.orderDate ? new Date(po.orderDate) : po.createdAt ? new Date(po.createdAt) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d >= cutoff;
    });
  }, [supplierPOs, statusFilter, dateFilter]);

  const summary = useMemo(() => {
    const count = filteredPOs.length;
    const totalValue = filteredPOs.reduce((sum, po) => sum + toNumber(po.totalAmount), 0);
    const openCount = filteredPOs.filter((po) => ["draft", "sent", "partial"].includes((po.status || "").toLowerCase())).length;
    return { count, totalValue, openCount };
  }, [filteredPOs]);

  const activityFeed = useMemo(() => {
    const activities = [];
    filteredPOs.forEach((po) => {
      const orderDate = po.orderDate ? new Date(po.orderDate) : po.createdAt ? new Date(po.createdAt) : null;
      if (orderDate && !Number.isNaN(orderDate.getTime())) {
        activities.push({
          date: orderDate,
          label: `Purchase order ${po.orderNumber || po._id} created`,
          meta: `${formatCurrency(po.totalAmount || 0, po.currency || userCurrency)} · ${po.status || "draft"}`,
        });
      }
      if (po.receivedAt) {
        const ra = new Date(po.receivedAt);
        if (!Number.isNaN(ra.getTime())) {
          activities.push({
            date: ra,
            label: `Goods received — ${po.orderNumber || po._id}`,
            meta: formatCurrency(po.totalAmount || 0, po.currency || userCurrency),
          });
        }
      }
      if ((po.status || "").toLowerCase() === "cancelled" && po.updatedAt) {
        const ua = new Date(po.updatedAt);
        if (!Number.isNaN(ua.getTime())) {
          activities.push({
            date: ua,
            label: `Purchase order cancelled — ${po.orderNumber || po._id}`,
            meta: "",
          });
        }
      }
    });
    return activities.sort((a, b) => b.date - a.date);
  }, [filteredPOs, userCurrency]);

  const handleAddNote = () => {
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    const nextNote = { id: Date.now(), text: trimmed, createdAt: new Date().toISOString() };
    const next = [nextNote, ...accountNotes];
    setAccountNotes(next);
    setNoteInput("");
    const allNotes = JSON.parse(localStorage.getItem("supplySupplierAccountNotes") || "{}");
    allNotes[String(id)] = next;
    localStorage.setItem("supplySupplierAccountNotes", JSON.stringify(allNotes));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/supply-chain/suppliers")}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Suppliers
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Supplier not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/supply-chain/suppliers")}
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Suppliers
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-white">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{supplier.name}</h1>
              <p className="text-gray-600 dark:text-gray-300">{supplier.company || "Supplier account"}</p>
              {supplier.category ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Category: {supplier.category}</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm min-w-[260px]">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Purchase orders</p>
              <p className="font-semibold text-gray-900 dark:text-white">{summary.count}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Open POs</p>
              <p className="font-semibold text-amber-700 dark:text-amber-400">{summary.openCount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400">Total value (filtered)</p>
              <p className="font-semibold text-green-700 dark:text-green-400">
                {formatCurrency(summary.totalValue, userCurrency)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
          <p className="inline-flex items-center gap-2">
            <Mail className="w-4 h-4" /> {supplier.email || "—"}
          </p>
          <p className="inline-flex items-center gap-2">
            <Phone className="w-4 h-4" /> {supplier.phone || "—"}
          </p>
          <p className="inline-flex items-center gap-2 md:col-span-2">
            <MapPin className="w-4 h-4" /> {[supplier.address, supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}
          </p>
          {supplier.taxId ? (
            <p className="md:col-span-2 text-xs text-gray-500">Tax ID: {supplier.taxId}</p>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 shadow-sm">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="open">Open (draft / sent / partial)</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All time</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last 12 months</option>
            </select>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Procurement activity
        </h2>
        {filteredPOs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No purchase orders match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300">
                  <th className="py-2 pr-4">PO #</th>
                  <th className="py-2 pr-4">Order date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2">Lines</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map((po) => (
                  <tr
                    key={po._id}
                    className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => navigate("/supply-chain/procurement")}
                    title="Open procurement"
                  >
                    <td className="py-3 pr-4 font-medium text-blue-600 dark:text-blue-400">{po.orderNumber}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {po.orderDate ? moment(po.orderDate).format("MMM D, YYYY") : "—"}
                    </td>
                    <td className="py-3 pr-4 capitalize">{po.status || "—"}</td>
                    <td className="py-3 pr-4">{formatCurrency(po.totalAmount || 0, po.currency || userCurrency)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{Array.isArray(po.lines) ? po.lines.length : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account notes</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add a note for this supplier…"
            className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddNote}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700"
          >
            Add
          </button>
        </div>
        {accountNotes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {accountNotes.map((note) => (
              <div key={note.id} className="rounded-lg border border-gray-200 dark:border-slate-600 p-3">
                <p className="text-sm text-gray-900 dark:text-white">{note.text}</p>
                <p className="text-xs text-gray-500 mt-1">{moment(note.createdAt).format("MMM D, YYYY h:mm A")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity timeline</h2>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No activity to show.</p>
        ) : (
          <div className="space-y-3">
            {activityFeed.slice(0, 40).map((activity, idx) => (
              <div key={`${activity.label}-${idx}`} className="flex items-start gap-3">
                <CalendarDays className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.label}</p>
                  {activity.meta ? <p className="text-xs text-gray-500 dark:text-gray-400">{activity.meta}</p> : null}
                  <p className="text-xs text-gray-400">{moment(activity.date).format("MMM D, YYYY h:mm A")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyChainSupplierAccountPage;
