import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, Plus, AlertCircle, Sparkles, Search, Mail, Edit, Trash2, FileText, MessageCircle, CheckCircle2 } from "lucide-react";
import moment from "moment";
import { useNavigate, useSearchParams } from "react-router-dom";
import CreateWithAiModal from "../../components/invoices/CreateWithAiModal";
import ReminderModal from "../../components/invoices/ReminderModal";
import WhatsAppReminderModal from "../../components/invoices/WhatsAppReminderModal";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/helper";
import { isInvoiceGraLocked } from "../../utils/invoiceEdit";
import axiosinstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

function invoiceStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "fully paid" || s === "paid") return "bg-emerald-100 text-emerald-800";
  if (s === "partially paid") return "bg-[#B8860B] text-white";
  return "bg-red-100 text-red-800";
}

function hasRefundedEvent(invoice) {
  const events = Array.isArray(invoice?.refundEvents) ? invoice.refundEvents : [];
  return events.some((ev) => !ev?.cancelled);
}

function invoiceTypeLabel(type) {
  const t = (type || "invoice").toLowerCase();
  if (t === "quotation") return "Quotation";
  if (t === "proforma") return "Proforma";
  return "Invoice";
}

function invoiceTypeBadgeClass(type) {
  const t = (type || "invoice").toLowerCase();
  if (t === "quotation") return "bg-blue-50 text-blue-800 border-blue-100";
  if (t === "proforma") return "bg-amber-50 text-amber-800 border-amber-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function ActionIconButton({ title, onClick, className = "", children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border bg-white transition-colors shrink-0 ${className}`}
    >
      {children}
    </button>
  );
}

const AllInvoices = ({ typeFilter }) => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const canFilterByBranch = !user?.branch;
  const isQuotationsView = typeFilter === "quotation";
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(null);
  const [convertLoading, setConvertLoading] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const openEditInvoice = useCallback(
    async (invoice) => {
      if (!invoice?._id) return;
      if (isInvoiceGraLocked(invoice)) {
        toast.error("This invoice was submitted to GRA and can no longer be edited.");
        navigate(`/invoices/${invoice._id}`);
        return;
      }
      try {
        const res = await axiosinstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(invoice._id));
        const full = res.data || invoice;
        if (isInvoiceGraLocked(full)) {
          toast.error("This invoice was submitted to GRA and can no longer be edited.");
          navigate(`/invoices/${invoice._id}`);
          return;
        }
        navigate("/invoices/new", { state: { invoice: full } });
      } catch {
        navigate("/invoices/new", { state: { invoice } });
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!canFilterByBranch) return;
    const branchFromUrl = searchParams.get("branch");
    if (branchFromUrl) setBranchFilter(branchFromUrl);
  }, [searchParams, canFilterByBranch]);

  useEffect(() => {
    if (!canFilterByBranch) {
      setBranches([]);
      setBranchFilter("");
      return;
    }
    const load = async () => {
      try {
        const res = await axiosinstance.get(API_PATHS.BRANCHES.GET_ALL);
        setBranches(Array.isArray(res.data) ? res.data : []);
      } catch {
        setBranches([]);
      }
    };
    load();
  }, [canFilterByBranch]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = canFilterByBranch && branchFilter
        ? `${API_PATHS.INVOICES.GET_ALL_INVOICES}?branch=${encodeURIComponent(branchFilter)}`
        : API_PATHS.INVOICES.GET_ALL_INVOICES;
      const response = await axiosinstance.get(url);
      if (response.data && Array.isArray(response.data)) {
        const sortedInvoices = response.data.sort((a, b) => {
          const dateA = a.invoiceDate ? new Date(a.invoiceDate) : new Date(0);
          const dateB = b.invoiceDate ? new Date(b.invoiceDate) : new Date(0);
          return dateB - dateA;
        });
        setInvoices(sortedInvoices);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error fetching invoices";
      setError(errorMessage);
      toast.error(errorMessage);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [branchFilter, canFilterByBranch]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const handler = () => fetchInvoices();
    window.addEventListener("invoicesUpdated", handler);
    window.addEventListener("currencyChanged", handler);
    return () => {
      window.removeEventListener("invoicesUpdated", handler);
      window.removeEventListener("currencyChanged", handler);
    };
  }, [fetchInvoices]);

  const handleDelete = async (invoiceOrId) => {
    const invoice =
      typeof invoiceOrId === "object" && invoiceOrId
        ? invoiceOrId
        : invoices.find((inv) => inv._id === invoiceOrId);
    const id = invoice?._id || invoiceOrId;
    if (!id) return;
    if (isInvoiceGraLocked(invoice)) {
      toast.error("This invoice was submitted to GRA and cannot be deleted.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await axiosinstance.delete(API_PATHS.INVOICES.DELETE_INVOICE(id));
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        toast.success("Invoice deleted");
      } catch (error) {
        const msg = error.response?.data?.message || "Error deleting invoice";
        setError(msg);
        toast.error(msg);
      }
    }
  };

  const handleStatusChange = async (invoice) => {
    setStatusChangeLoading(invoice._id);
    try {
      const newStatus = "Fully Paid";
      const newAmountPaid = invoice.grandTotal || 0;

      const response = await axiosinstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(invoice._id), {
        status: newStatus,
        amountPaid: newAmountPaid,
      });

      setInvoices((prevInvoices) => 
        prevInvoices.map(inv => inv._id === invoice._id ? response.data : inv)
      );
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err.response?.data?.message || "Error updating invoice status");
      toast.error(err.response?.data?.message || "Failed to update invoice status");
    } finally {
      setStatusChangeLoading(null);
    }
  };

  const handleOpenReminderModal = (invoice) => {
    setSelectedInvoice(invoice);
    setIsReminderModalOpen(true);
  };

  const handleOpenWhatsAppModal = (invoice) => {
    if (!invoice?._id) {
      toast.error("Invoice not found.");
      return;
    }
    if (!String(invoice?.billTo?.phone || "").trim()) {
      toast.error("Customer phone number is missing.");
      return;
    }
    setSelectedInvoice(invoice);
    setIsWhatsAppModalOpen(true);
  };

  const handleConvertToInvoice = async (invoice) => {
    if (!invoice?.convertedTo && (invoice?.status === "Fully Paid" || invoice?.status === "Paid") && (invoice?.type === "proforma" || invoice?.type === "quotation")) {
      setConvertLoading(invoice._id);
      try {
        const res = await axiosinstance.post(API_PATHS.INVOICES.CONVERT_TO_INVOICE(invoice._id));
        const newInv = res.data.invoice;
        setInvoices((prev) => {
          const updated = prev.map((inv) => (inv._id === invoice._id ? { ...inv, convertedTo: newInv?._id } : inv));
          if (newInv && !updated.find((i) => i._id === newInv._id)) updated.unshift(newInv);
          return updated.sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0));
        });
        toast.success("Proforma converted to invoice: " + (newInv?.invoiceNumber || ""));
        if (newInv?._id) navigate(`/invoices/${newInv._id}`);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to convert");
      } finally {
        setConvertLoading(null);
      }
    }
  };


  const filteredInvoices = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return invoices
      .filter((invoice) => {
        if (statusFilter === "All") return true;
        const invoiceStatus = (invoice.status || "Unpaid").toLowerCase().trim();
        const filterStatus = statusFilter.toLowerCase().trim();
        
        // Handle "Paid" - matches "Paid", "Fully Paid"
        if (filterStatus === "paid") {
          return invoiceStatus === "paid" || invoiceStatus === "fully paid";
        }
        
        // Handle "Partially Paid"
        if (filterStatus === "partially paid") {
          return invoiceStatus === "partially paid";
        }
        
        // Handle "Unpaid" - matches "Unpaid" only
        if (filterStatus === "unpaid") {
          return invoiceStatus === "unpaid";
        }
        
        // Handle "Pending"
        if (filterStatus === "pending") {
          return invoiceStatus === "pending";
        }
        
        // Fallback to exact match
        return invoice.status === statusFilter;
      })
      .filter((invoice) =>
        (invoice.invoiceNumber || "").toLowerCase().includes(query) ||
        (invoice.billTo?.clientName || "").toLowerCase().includes(query)
      )
      .filter((invoice) => !typeFilter || (invoice.type || "invoice").toLowerCase() === typeFilter.toLowerCase());
  }, [invoices, statusFilter, searchTerm, typeFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-0">
      <CreateWithAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
      <ReminderModal
        invoiceId={selectedInvoice?._id}
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
      <WhatsAppReminderModal
        invoice={selectedInvoice}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-sm overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {isQuotationsView ? "Quotations" : "All Invoices"}
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                {isQuotationsView
                  ? "Manage your price estimates and quotations"
                  : "Manage all your invoices in one place"}
                {` · ${filteredInvoices.length} shown`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isQuotationsView && (
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Create with AI
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/invoices/new", { state: { type: "quotation" } })}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Quotation
            </button>
            <button
              type="button"
              onClick={() => navigate("/invoices/new")}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New invoice
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-4" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white/80">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search by invoice number or client name"
                className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {canFilterByBranch && branches.length > 0 && (
                <select
                  className="h-11 px-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                      {b.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="h-11 px-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden p-4 space-y-3">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice._id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => navigate(`/invoices/${invoice._id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${invoiceTypeBadgeClass(invoice.type)}`}
                    >
                      {invoiceTypeLabel(invoice.type)}
                    </span>
                    {invoice.convertedTo &&
                      ((invoice.type || "") === "proforma" || (invoice.type || "") === "quotation") && (
                        <span className="ml-1.5 text-xs text-slate-500">Converted</span>
                      )}
                    <p className="mt-1.5 font-semibold text-slate-900 truncate">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-600 truncate">{invoice.billTo?.clientName || "N/A"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Due {invoice.dueDate ? moment(invoice.dueDate).format("MMM DD, YYYY") : "N/A"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${invoiceStatusBadgeClass(invoice.status)}`}
                  >
                    {invoice.status || "Unpaid"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {typeof invoice.user === "object" && invoice.user?.name ? invoice.user.name : "—"}
                  </span>
                  <span className="text-base font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(Number(invoice.grandTotal || 0), userCurrency)}
                  </span>
                </div>
              </button>
              <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  {(invoice.status !== "Paid" && invoice.status !== "Fully Paid") && (
                    <ActionIconButton
                      title="Mark paid"
                      onClick={() => handleStatusChange(invoice)}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      {statusChangeLoading === invoice._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </ActionIconButton>
                  )}
                  <ActionIconButton
                    title={isInvoiceGraLocked(invoice) ? "View (GRA locked)" : "Edit invoice"}
                    onClick={() => openEditInvoice(invoice)}
                    className={
                      isInvoiceGraLocked(invoice)
                        ? "border-slate-200 text-slate-400 hover:bg-slate-50"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }
                  >
                    <Edit className="w-4 h-4" />
                  </ActionIconButton>
                  <ActionIconButton
                    title="Open"
                    onClick={() => navigate(`/invoices/${invoice._id}`)}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <FileText className="w-4 h-4" />
                  </ActionIconButton>
                  <ActionIconButton
                    title="Email reminder"
                    onClick={() => handleOpenReminderModal(invoice)}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Mail className="w-4 h-4" />
                  </ActionIconButton>
                  <ActionIconButton
                    title="WhatsApp"
                    onClick={() => handleOpenWhatsAppModal(invoice)}
                    className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </ActionIconButton>
                  <ActionIconButton
                    title={
                      isInvoiceGraLocked(invoice)
                        ? "Cannot delete — submitted to GRA"
                        : "Delete"
                    }
                    onClick={() => handleDelete(invoice)}
                    className={
                      isInvoiceGraLocked(invoice)
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-red-200 text-red-600 hover:bg-red-50"
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </ActionIconButton>
                </div>
                {((invoice.type || "invoice") === "proforma" || (invoice.type || "invoice") === "quotation") &&
                  !invoice.convertedTo &&
                  (invoice.status === "Fully Paid" || invoice.status === "Paid") && (
                  <button
                    type="button"
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => handleConvertToInvoice(invoice)}
                    disabled={convertLoading === invoice._id}
                  >
                    {convertLoading === invoice._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Convert"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Due
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice._id}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => navigate(`/invoices/${invoice._id}`)}
                >
                  <td className="px-5 py-3.5 align-middle">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border shrink-0 ${invoiceTypeBadgeClass(invoice.type)}`}
                      >
                        {invoiceTypeLabel(invoice.type)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {invoice.invoiceNumber}
                        </p>
                        {invoice.convertedTo &&
                          ((invoice.type || "") === "proforma" || (invoice.type || "") === "quotation") && (
                            <p className="text-[11px] text-slate-500">Converted</p>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 align-middle min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {invoice.billTo?.clientName || "N/A"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {typeof invoice.user === "object" && invoice.user?.name
                        ? `Created by ${invoice.user.name}`
                        : "Created by —"}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 align-middle text-right">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(Number(invoice.grandTotal || 0), userCurrency)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${invoiceStatusBadgeClass(invoice.status)}`}
                      >
                        {invoice.status || "Unpaid"}
                      </span>
                      {hasRefundedEvent(invoice) && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Refunded
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 align-middle text-sm text-slate-600 whitespace-nowrap">
                    {invoice.dueDate ? moment(invoice.dueDate).format("MMM DD, YYYY") : "N/A"}
                  </td>
                  <td className="px-5 py-3.5 align-middle">
                    <div
                      className="flex items-center justify-end gap-1.5 flex-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {((invoice.type || "invoice") === "proforma" || (invoice.type || "invoice") === "quotation") &&
                        !invoice.convertedTo &&
                        (invoice.status === "Fully Paid" || invoice.status === "Paid") && (
                          <button
                            type="button"
                            title="Convert to invoice"
                            onClick={() => handleConvertToInvoice(invoice)}
                            disabled={convertLoading === invoice._id}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 disabled:opacity-60"
                          >
                            {convertLoading === invoice._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Convert"
                            )}
                          </button>
                        )}
                      {(invoice.status !== "Paid" && invoice.status !== "Fully Paid") && (
                        <ActionIconButton
                          title="Mark paid"
                          onClick={() => handleStatusChange(invoice)}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          {statusChangeLoading === invoice._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </ActionIconButton>
                      )}
                      <ActionIconButton
                        title={isInvoiceGraLocked(invoice) ? "View (GRA locked)" : "Edit invoice"}
                        onClick={() => openEditInvoice(invoice)}
                        className={
                          isInvoiceGraLocked(invoice)
                            ? "border-slate-200 text-slate-400 hover:bg-slate-50"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="Open"
                        onClick={() => navigate(`/invoices/${invoice._id}`)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <FileText className="w-4 h-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="Email reminder"
                        onClick={() => handleOpenReminderModal(invoice)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Mail className="w-4 h-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="WhatsApp"
                        onClick={() => handleOpenWhatsAppModal(invoice)}
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title={
                          isInvoiceGraLocked(invoice)
                            ? "Cannot delete — submitted to GRA"
                            : "Delete"
                        }
                        onClick={() => handleDelete(invoice)}
                        className={
                          isInvoiceGraLocked(invoice)
                            ? "border-slate-200 text-slate-300 cursor-not-allowed"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </ActionIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && !loading && (
          <div className="text-center py-14 px-4">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {invoices.length === 0 ? "No invoices yet" : "No invoices match your filters"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {invoices.length === 0
                ? "Create your first invoice to get started."
                : "Try another search or status filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllInvoices;