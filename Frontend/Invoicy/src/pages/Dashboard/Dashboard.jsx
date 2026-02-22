import {useEffect, useState} from "react";
import axiosInstance from "../../utils/axiosInstance";
import {API_PATHS} from "../../utils/apiPaths";
import {Loader2, FileText, DollarSign, Plus, } from "lucide-react";
import {useNavigate, useLocation} from "react-router-dom";
import  moment from "moment";
import Button from "../../components/ui/Button";
import AIInsightsCard from "../../components/ui/AIInsightsCard";
import { formatCurrency } from "../../utils/helper";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userCurrency = user?.currency || 'GHS';
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalUnpaid: 0,
    totalVat: 0,
    totalNhil: 0,
    totalGetFund: 0,
    topCustomers: [],
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `${API_PATHS.INVOICES.GET_ALL_INVOICES}?_=${Date.now()}`
      );
      const invoices = response.data;
      const normalizeStatus = (status) => {
        const raw = (status || "").toLowerCase();
        if (raw === "paid" || raw === "fully paid") return "fully paid";
        if (raw === "partially paid" || raw === "partial") return "partially paid";
        if (raw === "pending" || raw === "overdue") return "unpaid";
        return raw;
      };
      const totalInvoices = invoices.length;
      const totalPaid = invoices
        .filter((inv) => normalizeStatus(inv.status) === "fully paid")
        .reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
      const totalPartial = invoices
        .filter((inv) => normalizeStatus(inv.status) === "partially paid")
        .reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
      // Total unpaid includes both unpaid and partially paid invoices (matching reports page)
      const totalUnpaid = invoices
        .filter((inv) => {
          const status = normalizeStatus(inv.status);
          return status !== "fully paid";
        })
        .reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

      const totalVat = invoices.reduce((acc, inv) => acc + (inv.totalVat || 0), 0);
      const totalNhil = invoices.reduce((acc, inv) => acc + (inv.totalNhil || 0), 0);
      const totalGetFund = invoices.reduce((acc, inv) => acc + (inv.totalGetFund || 0), 0);

      const customerMap = new Map();
      invoices.forEach((inv) => {
        const customerName = inv.billTo?.clientName || "Unknown";
        const entry = customerMap.get(customerName) || { name: customerName, count: 0, total: 0 };
        entry.count += 1;
        entry.total += inv.grandTotal || 0;
        customerMap.set(customerName, entry);
      });

      const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.count - a.count || b.total - a.total)
        .slice(0, 10)
        .map((c) => ({
          name: c.name,
          frequency: c.count,
          total: Number(c.total.toFixed(2)),
        }));

      setStats({
        totalInvoices,
        totalRevenue: totalPaid,
        totalUnpaid,
        totalPartial,
        totalVat,
        totalNhil,
        totalGetFund,
        topCustomers,
      });

      setRecentInvoices(
        invoices
          .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
          .slice(0, 5)
      );
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname !== "/dashboard") return;
    fetchDashboardData();
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => fetchDashboardData();
    window.addEventListener("invoicesUpdated", handler);
    return () => window.removeEventListener("invoicesUpdated", handler);
  }, []);

  const statsData = [
    { icon: FileText,
      label: "Total Invoices",
      value: stats.totalInvoices,
      color: "blue",
    },
    {
      icon : DollarSign,
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue, userCurrency),
      color: "emerald",
    },
    {
      icon: DollarSign,
      label: "Total Unpaid",
      value: formatCurrency(stats.totalUnpaid, userCurrency),
      color: "red",
    },
  ];

  const colorClasses = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-100 ", text: "text-emerald-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
  };

  const summaryChartData = [
    { name: "Invoices", value: stats.totalInvoices },
    { name: "Revenue", value: Number(stats.totalRevenue.toFixed(2)) },
    { name: "Unpaid", value: Number(stats.totalUnpaid.toFixed(2)) },
  ];

  const paymentStatusData = [
    { name: "Fully Paid", value: Number(stats.totalRevenue.toFixed(2)) },
    { name: "Partially Paid", value: Number((stats.totalPartial || 0).toFixed(2)) },
    { name: "Unpaid", value: Number(stats.totalUnpaid.toFixed(2)) },
  ];

  const pieColors = ["#10b981", "#f59e0b", "#ef4444"];

  const taxSummaryData = [
    { name: "VAT", value: Number((stats.totalVat || 0).toFixed(2)) },
    { name: "NHIL", value: Number((stats.totalNhil || 0).toFixed(2)) },
    { name: "GETFUND", value: Number((stats.totalGetFund || 0).toFixed(2)) },
  ];

  const topCustomersData = stats.topCustomers || [];


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600"/>
        <div className="mt-4 text-slate-500 text-sm">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Debug output for API errors */}
      {stats.totalInvoices === 0 && recentInvoices.length === 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
          <div className="text-slate-600 dark:text-slate-300 text-sm font-medium">No invoices yet.</div>
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t("dashboard.title") || "Dashboard"}
        </h2>
        <p className="text-sm text-slate-600 dark:text-white mt-1">
          {t("dashboard.subtitle") || "View your invoice and revenue summary"}
        </p>
      </div>

      {/* Stats Cards - explicit text colors so hover never makes text white in light mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsData.map((stat, index) => (
          <div
            key={index}
            className="dashboard-stat-card stat-card-bg p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-gray-200 dark:shadow-none hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-shadow transition-colors">
            <div className="flex items-center">
              <div
                className={`flex-shrink-0 w-12 h-12 ${colorClasses[stat.color].bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${colorClasses[stat.color].text}`} />
              </div>
              <div className="ml-4 min-w-0">
                <div className="dashboard-stat-label text-sm font-medium truncate text-slate-600">{stat.label}</div>
                <div className="dashboard-stat-value text-2xl font-bold break-words text-slate-900">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights Cards */}
      <AIInsightsCard />

      {/* Charts - keep black text on white background in dark mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-chart-section">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-gray-100">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
            <p className="text-sm text-slate-500">Invoices, revenue, and unpaid totals</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `GH₵ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-gray-100">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Payment Status</h3>
            <p className="text-sm text-slate-500">Fully paid, partially paid, and unpaid totals</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value) => `GH₵ ${Number(value).toFixed(2)}`} />
                <Pie
                  data={paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
              Fully Paid
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
              Partially Paid
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              Unpaid
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Top Customers Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-chart-section">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-gray-100">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Tax Summary</h3>
            <p className="text-sm text-slate-500">GRA VAT, NHIL, GETFUND totals</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taxSummaryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `GH₵ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-gray-100">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Top Customers</h3>
            <p className="text-sm text-slate-500">Top 10 by frequency and total amount</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomersData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) =>
                    name === "total" ? `GH₵ ${Number(value).toFixed(2)}` : value
                  }
                  labelFormatter={() => ""}
                />
                <Bar yAxisId="left" dataKey="frequency" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              Frequency
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
              Total Amount
            </div>
          </div>
        </div>
      </div>



      {/* Recent Invoices */}
      <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm shadow-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Invoices
          </h3>
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            View all
          </Button>
        </div>
        {recentInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {recentInvoices.map((invoice) => (
                  <tr 
                    key={invoice._id} 
                    className="hover:bg-teal-700 group transition-colors duration-150 cursor-pointer" 
                    onClick={() => navigate(`/invoices/${invoice._id}`)}
                  >
                    <td className="px-6 py-4 white-space-nowrap">
                      <div className="text-sm font-medium text-slate-900 group-hover:text-white">
                        {invoice.billTo?.clientName || 'N/A'}
                      </div>
                      <div className="text-sm text-slate-500 group-hover:text-white">
                        #{invoice.invoiceNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 group-hover:text-white">
                      {formatCurrency(invoice.grandTotal, userCurrency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(() => {
                        const status = (invoice.status || "").toLowerCase();
                        if (status === "paid" || status === "fully paid") return "bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 group-hover:text-emerald-900";
                        if (status === "partially paid" || status === "partial") return "bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200 group-hover:text-yellow-900";
                        return "bg-red-100 text-red-800 group-hover:bg-red-200 group-hover:text-red-900";
                      })()}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 group-hover:text-white">
                      {moment(invoice.dueDate).format("MMM D, YYYY")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
            <p className="text-slate-500 mb-6 max-w-md">Create and send invoices to your clients to see them here.</p>
            <Button onClick={() => navigate('/invoices/create')} className="flex items-center gap-2 mx-auto">
              <Plus size={16} />
              Create Invoice
            </Button>
          </div>
        )}
      </div>
    </div>
  )
};

export default Dashboard;