import React, { useState, useEffect, useMemo, useCallback } from "react"; 
import axiosinstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { Loader2, Plus, AlertCircle, Sparkles, Search, Mail, Edit, Trash2, FileText } from "lucide-react";
import moment from "moment";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import CreateWithAiModal from "../../components/invoices/CreateWithAiModal";
import ReminderModal from "../../components/invoices/ReminderModal";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const AllInvoices = ({ typeFilter }) => {
  const { user } = useAuth();
  const isQuotationsView = typeFilter === "quotation";
  const canEditInvoice = ["owner", "admin"].includes(user?.role || "");
  const canDeleteInvoice = ["owner", "admin"].includes(user?.role || "");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(null);
  const [convertLoading, setConvertLoading] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const branchFromUrl = searchParams.get("branch");
    if (branchFromUrl) setBranchFilter(branchFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosinstance.get(API_PATHS.BRANCHES.GET_ALL);
        setBranches(Array.isArray(res.data) ? res.data : []);
      } catch {
        setBranches([]);
      }
    };
    load();
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = branchFilter
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
  }, [branchFilter]);

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

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await axiosinstance.delete(API_PATHS.INVOICES.DELETE_INVOICE(id));
        setInvoices((prev) => prev.filter((invoice) => invoice._id !== id));
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
      const currentStatus = invoice.status || "Unpaid";
      const isPaid = currentStatus === "Paid" || currentStatus === "Fully Paid";
      const newStatus = isPaid ? "Unpaid" : "Fully Paid";
      
      // Calculate payment amount based on desired status
      let newAmountPaid = invoice.amountPaid || 0;
      if (newStatus === "Fully Paid") {
        newAmountPaid = invoice.grandTotal || 0;
      } else if (newStatus === "Unpaid") {
        newAmountPaid = 0;
      }

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
    <div className="space-y-6 bg-white dark:bg-slate-900 min-h-0">
      <CreateWithAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
      <ReminderModal
        invoiceId={selectedInvoice?._id}
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <div className="min-w-0 bg-white dark:bg-transparent rounded-md pr-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{isQuotationsView ? "Quotations" : "All Invoices"}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-snug">{isQuotationsView ? "Manage your price estimates and quotations" : "Manage all your invoices in one place"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isQuotationsView && (
            <Button variant="secondary" onClick={() => setIsAiModalOpen(true)} icon={Sparkles}>
              Create Invoice with Ai
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate("/invoices/new", { state: { type: "quotation" } })} icon={FileText}>
            Create Quotation
          </Button>
          <Button onClick={() => navigate("/invoices/new")} icon={Plus}>
            Create Invoice
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-4" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> 
                <Search className="h-5 w-5 text-slate-400" /> 
              </div>
              <input
                type="text"
                placeholder="Search by invoice number or client name"
                className="w-full h-10 pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {branches.length > 0 && (
              <div className="flex-shrink-0">
                <select
                  className="w-full sm:w-auto h-10 px-3 py-2 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-shrink-0">
              <select 
                className="w-full sm:w-auto h-10 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        {/* ADD YOUR INVOICES TABLE/LIST RENDER HERE */}

       <div className="overflow-hidden">
        <table className="w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Invoice Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Created by</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice._id} className="hover:bg-teal-700 group transition-colors duration-150 cursor-pointer" onClick={() => navigate(`/invoices/${invoice._id}`)}>
                <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${(invoice.type || "invoice") === "quotation" ? "bg-blue-100 text-blue-800" : (invoice.type || "invoice") === "proforma" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                    {(invoice.type || "invoice") === "quotation" ? "Quotation" : (invoice.type || "invoice") === "proforma" ? "Proforma" : "Invoice"}
                  </span>
                  {invoice.convertedTo && ((invoice.type || "") === "proforma" || (invoice.type || "") === "quotation") && (
                    <span className="ml-1 text-xs text-slate-500">Converted</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-black group-hover:text-white" onClick={() => navigate(`/invoices/${invoice._id}`)}>{invoice.invoiceNumber}</td>
                <td className="px-4 py-4 text-sm text-black group-hover:text-white" onClick={() => navigate(`/invoices/${invoice._id}`)}>{invoice.billTo?.clientName || 'N/A'}</td>
                <td className="px-4 py-4 text-sm text-black group-hover:text-white" onClick={() => navigate(`/invoices/${invoice._id}`)}>{typeof invoice.user === 'object' && invoice.user?.name ? invoice.user.name : '—'}</td>
                <td className="px-4 py-4 text-sm text-black group-hover:text-white" onClick={() => navigate(`/invoices/${invoice._id}`)}>GH₵ {Number(invoice.grandTotal || 0).toLocaleString()}</td>
                <td className="px-4 py-4 text-sm text-black">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (invoice.status || "").toLowerCase() === "fully paid" || (invoice.status || "").toLowerCase() === "paid"
                      ? "bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 group-hover:text-emerald-900"
                      : (invoice.status || "").toLowerCase() === "partially paid"
                      ? "bg-[#B8860B] text-white group-hover:bg-[#9a7209] group-hover:text-white"
                      : "bg-red-100 text-red-800 group-hover:bg-red-200 group-hover:text-red-900"
                  }`}>
                    {invoice.status || "Unpaid"}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-black group-hover:text-white">{invoice.dueDate ? moment(invoice.dueDate).format("MMM DD, YYYY") : "N/A"}</td>
                <td className="px-4 py-4 text-sm text-black">
                  <div className="flex items-center justify-end gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {((invoice.type || "invoice") === "proforma" || (invoice.type || "invoice") === "quotation") && !invoice.convertedTo && (invoice.status === "Fully Paid" || invoice.status === "Paid") && (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => handleConvertToInvoice(invoice)}
                        disabled={convertLoading === invoice._id}
                        title="Convert to invoice for VAT reporting"
                      >
                        {convertLoading === invoice._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Convert
                      </Button>
                    )}
                    <Button 
                      size="small" 
                      variant="secondary" 
                      onClick={() => handleStatusChange(invoice)}
                      disabled={statusChangeLoading === invoice._id}
                    >
                      {statusChangeLoading === invoice._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        (invoice.status === "Paid" || invoice.status === "Fully Paid") ? "Mark Unpaid" : "Mark Paid"
                      )}
                    </Button>

                    <Button size="small" variant="secondary" onClick={() => navigate(`/invoices/${invoice._id}`)}><Edit className="w-4 h-4" /></Button>
                    <Button size="small" variant="secondary" onClick={() => handleDelete(invoice._id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    <Button size="small" variant="ghost" onClick={() => handleOpenReminderModal(invoice)} title="Send Email Reminder">
                      <Mail className="w-4 h-4 text-blue-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">
            {invoices.length === 0 
              ? "No invoices yet. Create your first invoice to get started."
              : "No invoices match your search criteria."}
          </div>
        )}
       </div>
      </div>
    </div>
  );
};

export default AllInvoices;