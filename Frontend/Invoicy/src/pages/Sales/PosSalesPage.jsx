import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { Loader2, Search, ScanBarcode, ExternalLink } from "lucide-react";
import moment from "moment";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import toast from "react-hot-toast";

function posPaymentMethod(inv) {
    const notes = inv.notes || "";
    const m = notes.match(/POS sale · Payment:\s*(.+?)\s*$/im);
    if (m) return m[1].trim();
    if (inv.paymentTerms && String(inv.paymentTerms).trim() && inv.posSale) return inv.paymentTerms.trim();
    if (inv.paymentTerms && String(inv.paymentTerms).trim()) return inv.paymentTerms.trim();
    return "—";
}

const PosSalesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userCurrency = user?.currency || "GHS";
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [branches, setBranches] = useState([]);
    const [branchFilter, setBranchFilter] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axiosInstance.get(API_PATHS.BRANCHES.GET_ALL);
                setBranches(Array.isArray(res.data) ? res.data : []);
            } catch {
                setBranches([]);
            }
        };
        load();
    }, []);

    const fetchPosSales = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set("posSale", "true");
            if (branchFilter) params.set("branch", branchFilter);
            const url = `${API_PATHS.INVOICES.GET_ALL_INVOICES}?${params.toString()}`;
            const res = await axiosInstance.get(url);
            const list = Array.isArray(res.data) ? res.data : [];
            const sorted = [...list].sort((a, b) => {
                const dateA = a.invoiceDate ? new Date(a.invoiceDate) : new Date(0);
                const dateB = b.invoiceDate ? new Date(b.invoiceDate) : new Date(0);
                return dateB - dateA;
            });
            setRows(sorted);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Could not load POS sales";
            toast.error(msg);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [branchFilter]);

    useEffect(() => {
        fetchPosSales();
    }, [fetchPosSales]);

    useEffect(() => {
        const handler = () => fetchPosSales();
        window.addEventListener("invoicesUpdated", handler);
        window.addEventListener("currencyChanged", handler);
        return () => {
            window.removeEventListener("invoicesUpdated", handler);
            window.removeEventListener("currencyChanged", handler);
        };
    }, [fetchPosSales]);

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (inv) =>
                (inv.invoiceNumber || "").toLowerCase().includes(q) ||
                (inv.billTo?.clientName || "").toLowerCase().includes(q) ||
                posPaymentMethod(inv).toLowerCase().includes(q)
        );
    }, [rows, searchTerm]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-white min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">POS sales</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Records of sales completed from the point of sale ({filtered.length} of {rows.length} shown)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to="/pos"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                        <ScanBarcode className="h-4 w-4" />
                        Open POS
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="p-4 sm:p-6 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by invoice no., customer, or payment method"
                                className="w-full h-10 pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {branches.length > 0 ? (
                            <select
                                className="w-full sm:w-auto h-10 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                            >
                                <option value="">All branches</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id}>
                                        {b.name}
                                        {b.isDefault ? " (Default)" : ""}
                                    </option>
                                ))}
                            </select>
                        ) : null}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200 table-auto min-w-[720px]">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Invoice
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Payment
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filtered.map((inv) => (
                                <tr key={inv._id} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-700">
                                        {inv.invoiceDate ? moment(inv.invoiceDate).format("MMM D, YYYY") : "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-gray-700 max-w-[10rem] truncate">
                                        {inv.billTo?.clientName || "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-gray-700">{posPaymentMethod(inv)}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-900 tabular-nums">
                                        {formatCurrency(inv.grandTotal || 0, userCurrency)}
                                    </td>
                                    <td className="px-4 py-2.5 text-sm">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                ["fully paid", "paid"].includes((inv.status || "").toLowerCase())
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : (inv.status || "").toLowerCase() === "partially paid"
                                                      ? "bg-amber-100 text-amber-900"
                                                      : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                            {inv.status || "Unpaid"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-right">
                                        <Button
                                            size="small"
                                            variant="secondary"
                                            onClick={() => navigate(`/invoices/${inv._id}`)}
                                            className="inline-flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {rows.length === 0
                            ? "No POS sales yet. Use Open POS to record a sale."
                            : "No records match your search."}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default PosSalesPage;
