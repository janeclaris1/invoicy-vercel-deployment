import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Loader2, Mail, MapPin, Phone, User } from "lucide-react";
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

const norm = (value) => String(value || "").trim().toLowerCase();

const CustomerAccount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [accountNotes, setAccountNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.CRM.CUSTOMER(id));
        setCustomer(res.data || null);
      } catch (_) {
        setCustomer(null);
      }
    };
    if (id) loadCustomer();
  }, [id]);

  useEffect(() => {
    const allNotes = JSON.parse(localStorage.getItem("customerAccountNotes") || "{}");
    const notes = Array.isArray(allNotes[String(id)]) ? allNotes[String(id)] : [];
    setAccountNotes(notes);
  }, [id]);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL_INVOICES);
        setInvoices(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, []);

  const customerInvoices = useMemo(() => {
    if (!customer) return [];
    const customerId = String(customer._id || customer.id || "");
    const customerName = norm(customer.name);
    const customerEmail = norm(customer.email);
    const customerTaxId = norm(customer.taxId);
    const customerPhone = norm(customer.phone);

    return invoices.filter((inv) => {
      const billTo = inv?.billTo || {};
      const billToCustomerId = String(billTo.customerId || "");
      if (customerId && billToCustomerId && customerId === billToCustomerId) return true;

      const invName = norm(billTo.clientName);
      const invEmail = norm(billTo.email);
      const invTin = norm(billTo.tin);
      const invPhone = norm(billTo.phone);

      // Prefer strong identifiers first to avoid mixing invoices from different customers
      // that may share generic names/company labels.
      const strongMatch =
        (customerTaxId && invTin && customerTaxId === invTin) ||
        (customerEmail && invEmail && customerEmail === invEmail) ||
        (customerPhone && invPhone && customerPhone === invPhone);
      if (strongMatch) return true;

      const hasStrongCustomerIdentity = Boolean(customerTaxId || customerEmail || customerPhone || customerId);
      if (hasStrongCustomerIdentity) return false;

      // Fallback for legacy records where only customer name exists on both sides.
      return customerName && invName && customerName === invName;
    });
  }, [customer, invoices]);

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    let cutoff = null;
    if (dateFilter === "30d") cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateFilter === "90d") cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (dateFilter === "365d") cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    return customerInvoices.filter((inv) => {
      const invStatus = norm(inv?.status || "unpaid");
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "paid" && (invStatus === "paid" || invStatus === "fully paid")) ||
        (statusFilter === "unpaid" && invStatus === "unpaid") ||
        (statusFilter === "overdue" && invStatus === "overdue");

      if (!statusMatches) return false;
      if (!cutoff) return true;
      const invDate = inv?.invoiceDate ? new Date(inv.invoiceDate) : null;
      if (!invDate || Number.isNaN(invDate.getTime())) return false;
      return invDate >= cutoff;
    });
  }, [customerInvoices, statusFilter, dateFilter]);

  const summary = useMemo(() => {
    const totalInvoices = filteredInvoices.length;
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + toNumber(inv.amountPaid), 0);
    const balance = totalRevenue - totalPaid;
    return { totalInvoices, totalRevenue, totalPaid, balance };
  }, [filteredInvoices]);

  const activityFeed = useMemo(() => {
    const activities = [];
    filteredInvoices.forEach((inv) => {
      const invoiceDate = inv?.invoiceDate ? new Date(inv.invoiceDate) : null;
      activities.push({
        date: invoiceDate,
        label: `Invoice ${inv.invoiceNumber || inv._id} created`,
        meta: `${formatCurrency(inv.grandTotal || 0, userCurrency)} · ${inv.status || "Unpaid"}`,
      });

      if (Array.isArray(inv.paymentHistory)) {
        inv.paymentHistory.forEach((payment) => {
          activities.push({
            date: payment?.date ? new Date(payment.date) : invoiceDate,
            label: `Payment received for ${inv.invoiceNumber || inv._id}`,
            meta: formatCurrency(payment?.amount || 0, userCurrency),
          });
        });
      }
    });
    return activities
      .filter((a) => a.date instanceof Date && !Number.isNaN(a.date.getTime()))
      .sort((a, b) => b.date - a.date);
  }, [filteredInvoices, userCurrency]);

  const handleAddNote = () => {
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    const nextNote = {
      id: Date.now(),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    const next = [nextNote, ...accountNotes];
    setAccountNotes(next);
    setNoteInput("");
    const allNotes = JSON.parse(localStorage.getItem("customerAccountNotes") || "{}");
    allNotes[String(id)] = next;
    localStorage.setItem("customerAccountNotes", JSON.stringify(allNotes));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Customer account not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate("/customers")}
        className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">{customer.company || "Customer account"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm min-w-[280px]">
            <div>
              <p className="text-gray-500">Total Invoices</p>
              <p className="font-semibold text-gray-900">{summary.totalInvoices}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Revenue</p>
              <p className="font-semibold text-green-700">{formatCurrency(summary.totalRevenue, userCurrency)}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Paid</p>
              <p className="font-semibold text-blue-700">{formatCurrency(summary.totalPaid, userCurrency)}</p>
            </div>
            <div>
              <p className="text-gray-500">Balance Due</p>
              <p className="font-semibold text-amber-700">{formatCurrency(summary.balance, userCurrency)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
          <p className="inline-flex items-center gap-2"><Mail className="w-4 h-4" /> {customer.email || "-"}</p>
          <p className="inline-flex items-center gap-2"><Phone className="w-4 h-4" /> {customer.phone || "-"}</p>
          <p className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> {customer.address || "-"}</p>
          <p className="inline-flex items-center gap-2"><User className="w-4 h-4" /> Tax ID: {customer.taxId || "-"}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date Filter</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All time</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last 12 months</option>
            </select>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Activity</h2>
        {filteredInvoices.length === 0 ? (
          <p className="text-sm text-gray-500">No invoice activity found for this customer yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Paid</th>
                  <th className="py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const total = toNumber(inv.grandTotal);
                  const paid = toNumber(inv.amountPaid);
                  return (
                    <tr
                      key={inv._id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/invoices/${inv._id}`)}
                    >
                      <td className="py-3 pr-4 font-medium text-blue-700">{inv.invoiceNumber || inv._id}</td>
                      <td className="py-3 pr-4">{inv.invoiceDate ? moment(inv.invoiceDate).format("MMM D, YYYY") : "-"}</td>
                      <td className="py-3 pr-4">{inv.status || "Unpaid"}</td>
                      <td className="py-3 pr-4">{formatCurrency(total, userCurrency)}</td>
                      <td className="py-3 pr-4">{formatCurrency(paid, userCurrency)}</td>
                      <td className="py-3">{formatCurrency(total - paid, userCurrency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Notes</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add note or activity entry for this customer..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddNote}
            className="px-4 py-2 rounded-lg bg-blue-900 text-white text-sm hover:bg-blue-800"
          >
            Add
          </button>
        </div>
        {accountNotes.length === 0 ? (
          <p className="text-sm text-gray-500">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {accountNotes.map((note) => (
              <div key={note.id} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm text-gray-900">{note.text}</p>
                <p className="text-xs text-gray-500 mt-1">{moment(note.createdAt).format("MMM D, YYYY h:mm A")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Feed</h2>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-gray-500">No activity to show yet.</p>
        ) : (
          <div className="space-y-3">
            {activityFeed.slice(0, 20).map((activity, index) => (
              <div key={`${activity.label}-${index}`} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CalendarDays className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.label}</p>
                  <p className="text-xs text-gray-500">{activity.meta}</p>
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

export default CustomerAccount;
