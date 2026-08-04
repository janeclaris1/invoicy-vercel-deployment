import { useEffect, useMemo, useState, Fragment } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, Download, Printer, Calendar, TrendingUp, DollarSign, FileCheck, Building2, Filter, Undo2 } from "lucide-react";
import Button from "../../components/ui/Button";
import moment from "moment";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import {
  buildInvoiceJournalMarkup,
  buildInvoiceReportFilename,
  downloadInvoiceReportCsv,
  downloadInvoiceReportExcel,
  downloadInvoiceReportWord,
  formatJournalPeriod,
  groupInvoiceReportRows,
  INVOICE_JOURNAL_CSS,
} from "../../utils/invoiceReportExport";
// html2pdf will be loaded dynamically

const REPORT_TYPE_OPTIONS = [
  { id: "invoice-report", name: "Invoice Report", icon: FileText, description: "Invoice journal with tax breakdown" },
  { id: "sales", name: "Sales Summary", icon: TrendingUp, description: "Overview of all sales" },
  { id: "tax", name: "Tax Report (GRA)", icon: FileCheck, description: "GRA compliance report" },
  { id: "customer", name: "Customer Report", icon: Building2, description: "Customer analysis" },
  { id: "payment", name: "Payment Report", icon: DollarSign, description: "Payment tracking" },
  { id: "refund", name: "Refund Report", icon: Undo2, description: "Monthly refund totals" },
  { id: "zd-daily", name: "ZD Daily Report", icon: Calendar, description: "Daily sales and stamping summary" },
];

const isValidReportType = (type) => REPORT_TYPE_OPTIONS.some((option) => option.id === type);

const Reports = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [searchParams, setSearchParams] = useSearchParams();
  const [reportType, setReportType] = useState(() => {
    const typeFromUrl = new URLSearchParams(window.location.search).get("type");
    return isValidReportType(typeFromUrl) ? typeFromUrl : "invoice-report";
  });
  const [dateRange, setDateRange] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD')
  });
  const [filters, setFilters] = useState({
    customer: "all",
    status: "all",
    paymentMethod: "all"
  });
  // Draft values in the form; applied values drive the report after Generate
  const [draftDateRange, setDraftDateRange] = useState(() => ({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD')
  }));
  const [draftFilters, setDraftFilters] = useState({
    customer: "all",
    status: "all",
    paymentMethod: "all"
  });
  const [submitting, setSubmitting] = useState(false);
  const [graSubmission, setGraSubmission] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getCustomerName = (invoice) => {
    return (
      invoice?.billTo?.clientName ||
      invoice?.billTo?.name ||
      invoice?.billTo?.businessName ||
      invoice?.customerName ||
      invoice?.businessPartnerName ||
      "Unknown"
    );
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL_INVOICES);
        if (!isMounted) return;
        const data = response.data || [];
        setInvoices(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch report data:", error);
        
        // Check if it's a network error (backend not running)
        if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('Network Error')) {
          if (isMounted) {
            toast.error("Cannot connect to server. Please ensure the backend server is running on port 8000.", {
              duration: 5000,
            });
            // Only set empty array if we don't have any invoices yet
            setInvoices((prev) => prev.length === 0 ? [] : prev);
          }
        } else if (error.response?.status === 500) {
          if (isMounted) {
            toast.error("Server error. Please check if MongoDB is connected.", {
              duration: 5000,
            });
          }
        } else {
          if (isMounted) {
            toast.error(error.response?.data?.message || "Failed to load reports data.", {
              duration: 4000,
            });
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInvoices();
    // Reduce interval to 60 seconds to avoid spamming failed requests
    const interval = setInterval(() => {
      fetchInvoices().catch(() => {
        // Silently handle errors in auto-refresh to avoid toast spam
      });
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  useEffect(() => {
    const handler = () => setRefreshTrigger((t) => t + 1);
    window.addEventListener("invoicesUpdated", handler);
    window.addEventListener("currencyChanged", handler);
    return () => {
      window.removeEventListener("invoicesUpdated", handler);
      window.removeEventListener("currencyChanged", handler);
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = moment(inv.invoiceDate);
      const startBoundary = moment(dateRange.startDate).startOf("day");
      const endBoundary = moment(dateRange.endDate).endOf("day");
      const inRange = invDate.isSameOrAfter(startBoundary) && invDate.isSameOrBefore(endBoundary);

      const customerMatch = filters.customer === "all"
        ? true
        : getCustomerName(inv) === filters.customer;

      const normalizeStatus = (status) => {
        const raw = (status || "").toLowerCase();
        if (raw === "paid" || raw === "fully paid") return "fully paid";
        if (raw === "partially paid" || raw === "partial") return "partially paid";
        if (raw === "pending" || raw === "overdue") return "unpaid";
        return raw;
      };
      const normalizedStatus = normalizeStatus(inv.status);
      const filterStatus = (filters.status || "").toLowerCase();
      const normalizedFilter = filterStatus === "fully-paid"
        ? "fully paid"
        : filterStatus === "partially-paid"
          ? "partially paid"
          : filterStatus === "pending" || filterStatus === "overdue"
            ? "unpaid"
            : filterStatus;
      const statusMatch = normalizedFilter === "all"
        ? true
        : normalizedStatus === normalizedFilter;

      return inRange && customerMatch && statusMatch;
    });
  }, [invoices, dateRange, filters]);

  const reportData = useMemo(() => {
    // VAT and tax reporting: only formal invoices (exclude proforma until converted)
    const invoicesForVat = filteredInvoices.filter((inv) => (inv.type || "invoice") !== "proforma" && (inv.type || "invoice") !== "quotation");

    const totalSales = invoicesForVat.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    const totalVat = invoicesForVat.reduce((sum, inv) => sum + Number(inv.totalVat || 0), 0);
    const totalNhil = invoicesForVat.reduce((sum, inv) => sum + Number(inv.totalNhil || 0), 0);
    const totalGetFund = invoicesForVat.reduce((sum, inv) => sum + Number(inv.totalGetFund || 0), 0);
    const totalLevies = totalNhil + totalGetFund;
    const totalTax = totalVat + totalLevies;
    const taxableSales = invoicesForVat.reduce((sum, inv) => {
      const baseSubtotal = Number(inv.subtotal || 0);
      if (baseSubtotal > 0) return sum + baseSubtotal;
      const derivedBase = Number(inv.grandTotal || 0) - (Number(inv.totalVat || 0) + Number(inv.totalNhil || 0) + Number(inv.totalGetFund || 0));
      return sum + (Number.isFinite(derivedBase) ? derivedBase : 0);
    }, 0);
    const paidInvoices = invoicesForVat.filter((inv) => {
      const normalized = (inv.status || "").toLowerCase();
      return normalized === "paid" || normalized === "fully paid";
    });
    const pendingInvoices = invoicesForVat.filter((inv) => {
      const normalized = (inv.status || "").toLowerCase();
      return !(normalized === "paid" || normalized === "fully paid");
    });
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    const totalUnpaidAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    const refundedInvoices = invoicesForVat.filter((inv) =>
      Array.isArray(inv.refundEvents) && inv.refundEvents.some((ev) => !ev?.cancelled)
    );
    const refundedAmount = refundedInvoices.reduce((sum, inv) => {
      const events = Array.isArray(inv.refundEvents) ? inv.refundEvents : [];
      const activeEvents = events.filter((ev) => !ev?.cancelled);
      return sum + activeEvents.reduce((eventSum, ev) => eventSum + Number(ev.amount || 0), 0);
    }, 0);

    const customerMap = new Map();
    filteredInvoices.forEach((inv) => {
      const name = getCustomerName(inv);
      const entry = customerMap.get(name) || { name, revenue: 0, invoices: 0 };
      entry.revenue += Number(inv.grandTotal || 0);
      entry.invoices += 1;
      customerMap.set(name, entry);
    });

    const allCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue || b.invoices - a.invoices);

    const topCustomers = allCustomers.slice(0, 10);

    const salesByMonthMap = new Map();
    filteredInvoices.forEach((inv) => {
      const monthKey = moment(inv.invoiceDate).format("MMM");
      salesByMonthMap.set(monthKey, (salesByMonthMap.get(monthKey) || 0) + Number(inv.grandTotal || 0));
    });
    const salesByMonth = Array.from(salesByMonthMap.entries()).map(([month, amount]) => ({ month, amount }));

    return {
      summary: {
        totalSales,
        totalInvoices: invoicesForVat.length,
        paidInvoices: paidInvoices.length,
        pendingInvoices: pendingInvoices.length,
        totalTax,
        totalVat,
        totalNhil,
        totalGetFund,
        totalLevies,
        taxableSales,
        netRevenue: totalSales - totalTax,
        totalRevenue,
        totalUnpaidAmount,
        refundedInvoices: refundedInvoices.length,
        refundedAmount,
      },
      topCustomers,
      customers: allCustomers,
      salesByMonth,
    };
  }, [filteredInvoices]);

  const zdDailyData = useMemo(() => {
    const reportDate = moment(dateRange.endDate).format("YYYY-MM-DD");
    const dayStart = moment(reportDate).startOf("day");
    const dayEnd = moment(reportDate).endOf("day");

    const dailyInvoices = invoices.filter((inv) => {
      const invDate = moment(inv.invoiceDate);
      return (
        invDate.isSameOrAfter(dayStart) &&
        invDate.isSameOrBefore(dayEnd) &&
        (inv.type || "invoice") !== "proforma" &&
        (inv.type || "invoice") !== "quotation"
      );
    });

    const isStamped = (inv) =>
      Boolean(
        inv?.graReceiptNumber ||
          inv?.graVerificationCode ||
          inv?.graStatus === "SUCCESS" ||
          inv?.graStatus === "APPROVED"
      );

    const stampedInvoices = dailyInvoices.filter(isStamped);
    const unstampedInvoices = dailyInvoices.filter((inv) => !isStamped(inv));
    const totalSales = dailyInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    const totalVat = dailyInvoices.reduce((sum, inv) => sum + Number(inv.totalVat || 0), 0);
    const totalNhil = dailyInvoices.reduce((sum, inv) => sum + Number(inv.totalNhil || 0), 0);
    const totalGetFund = dailyInvoices.reduce((sum, inv) => sum + Number(inv.totalGetFund || 0), 0);
    const totalLevies = totalNhil + totalGetFund;
    const refundedAmount = dailyInvoices.reduce((sum, inv) => {
      const events = Array.isArray(inv.refundEvents) ? inv.refundEvents : [];
      const activeEvents = events.filter((ev) => !ev?.cancelled);
      return sum + activeEvents.reduce((eventSum, ev) => eventSum + Number(ev.amount || 0), 0);
    }, 0);

    return {
      reportDate,
      dailyInvoices,
      summary: {
        totalInvoices: dailyInvoices.length,
        stampedInvoices: stampedInvoices.length,
        unstampedInvoices: unstampedInvoices.length,
        totalSales,
        totalVat,
        totalNhil,
        totalGetFund,
        totalLevies,
        refundedAmount,
        netSalesAfterRefunds: totalSales - refundedAmount,
      },
    };
  }, [invoices, dateRange.endDate]);

  const refundReportData = useMemo(() => {
    const rangeStart = moment(dateRange.startDate).startOf("day");
    const rangeEnd = moment(dateRange.endDate).endOf("day");
    const details = [];

    invoices.forEach((inv) => {
      if ((inv.type || "invoice") === "proforma" || (inv.type || "invoice") === "quotation") return;
      const events = Array.isArray(inv.refundEvents) ? inv.refundEvents : [];
      events.forEach((ev) => {
        if (ev?.cancelled) return;
        const eventDate = moment(ev.createdAt || inv.invoiceDate);
        if (!eventDate.isValid()) return;
        if (eventDate.isBefore(rangeStart) || eventDate.isAfter(rangeEnd)) return;

        details.push({
          id: `${inv._id}-${ev.eventId || ev.reference || eventDate.valueOf()}`,
          monthKey: eventDate.format("YYYY-MM"),
          monthLabel: eventDate.format("MMMM YYYY"),
          date: eventDate.toDate(),
          invoiceNumber: inv.invoiceNumber || "-",
          customer: getCustomerName(inv),
          type: ev.type === "PARTIAL_REFUND" ? "Partial" : "Full",
          reference: ev.reference || "-",
          refundInvoiceNumber: ev.refundInvoiceNumber || "-",
          amount: Number(ev.amount || 0),
        });
      });
    });

    details.sort((a, b) => b.date - a.date);

    const monthMap = new Map();
    details.forEach((row) => {
      const entry = monthMap.get(row.monthKey) || {
        monthKey: row.monthKey,
        monthLabel: row.monthLabel,
        refundCount: 0,
        fullCount: 0,
        partialCount: 0,
        totalAmount: 0,
        invoiceIds: new Set(),
      };
      entry.refundCount += 1;
      entry.totalAmount += row.amount;
      if (row.type === "Partial") entry.partialCount += 1;
      else entry.fullCount += 1;
      entry.invoiceIds.add(row.invoiceNumber);
      monthMap.set(row.monthKey, entry);
    });

    const months = Array.from(monthMap.values())
      .map((m) => ({
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        refundCount: m.refundCount,
        fullCount: m.fullCount,
        partialCount: m.partialCount,
        invoiceCount: m.invoiceIds.size,
        totalAmount: Math.round(m.totalAmount * 100) / 100,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const totalAmount = details.reduce((sum, row) => sum + row.amount, 0);
    const fullCount = details.filter((row) => row.type === "Full").length;
    const partialCount = details.filter((row) => row.type === "Partial").length;

    return {
      months,
      details,
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        refundCount: details.length,
        fullCount,
        partialCount,
        invoiceCount: new Set(details.map((d) => d.invoiceNumber)).size,
        monthCount: months.length,
      },
    };
  }, [invoices, dateRange.startDate, dateRange.endDate]);

  const invoiceReportGroups = useMemo(() => {
    const invoicesForReport = filteredInvoices.filter(
      (inv) => (inv.type || "invoice") !== "proforma" && (inv.type || "invoice") !== "quotation"
    );
    return groupInvoiceReportRows(invoicesForReport, getCustomerName);
  }, [filteredInvoices]);

  const companyDetails = useMemo(
    () => ({
      name: user?.businessName || user?.companyName || user?.name || "",
      tin: user?.tin || "",
      address: user?.address || "",
      phone: user?.phone || "",
      email: user?.email || "",
    }),
    [user?.businessName, user?.companyName, user?.name, user?.tin, user?.address, user?.phone, user?.email]
  );

  const invoiceReportExportMeta = useMemo(
    () => ({
      groups: invoiceReportGroups,
      title: "Invoice Journal Report",
      periodLabel: formatJournalPeriod(dateRange.startDate, dateRange.endDate),
      generatedAt: moment().format("MMM DD, YYYY HH:mm"),
      companyDetails,
      currency: userCurrency,
    }),
    [invoiceReportGroups, dateRange.startDate, dateRange.endDate, companyDetails, userCurrency]
  );

  const invoiceJournalHtml = useMemo(
    () =>
      buildInvoiceJournalMarkup({
        groups: invoiceReportGroups,
        companyName: companyDetails.name,
        periodLabel: formatJournalPeriod(dateRange.startDate, dateRange.endDate),
        currency: userCurrency,
      }),
    [invoiceReportGroups, companyDetails.name, dateRange.startDate, dateRange.endDate, userCurrency]
  );

  const reportTypes = REPORT_TYPE_OPTIONS;

  useEffect(() => {
    const typeFromUrl = searchParams.get("type");
    if (isValidReportType(typeFromUrl) && typeFromUrl !== reportType) {
      setReportType(typeFromUrl);
      return;
    }
    if (!typeFromUrl && reportType) {
      setSearchParams({ type: reportType }, { replace: true });
    }
  }, [searchParams, reportType, setSearchParams]);

  useEffect(() => {
    document.body.classList.add("report-print-page");
    return () => document.body.classList.remove("report-print-page");
  }, []);

  const handleSelectReportType = (typeId) => {
    setReportType(typeId);
    setSearchParams({ type: typeId }, { replace: true });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportInvoiceCsv = () => {
    downloadInvoiceReportCsv({
      ...invoiceReportExportMeta,
      filename: buildInvoiceReportFilename(dateRange.startDate, dateRange.endDate, "csv"),
    });
    toast.success("CSV downloaded");
  };

  const handleExportInvoiceExcel = () => {
    downloadInvoiceReportExcel({
      ...invoiceReportExportMeta,
      filename: buildInvoiceReportFilename(dateRange.startDate, dateRange.endDate, "xlsx"),
    });
    toast.success("Excel file downloaded");
  };

  const handleExportInvoiceWord = () => {
    downloadInvoiceReportWord({
      ...invoiceReportExportMeta,
      filename: buildInvoiceReportFilename(dateRange.startDate, dateRange.endDate, "doc"),
    });
    toast.success("Word document downloaded");
  };

  const handleExportRefundCsv = () => {
    if (refundReportData.months.length === 0) {
      toast.error("No refunds to export for this period.");
      return;
    }
    const csvEscape = (value) => {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const monthlyHeaders = ["Month", "Refund Count", "Full", "Partial", "Invoices", "Total Refunded"];
    const monthlyLines = refundReportData.months.map((m) => [
      m.monthLabel,
      m.refundCount,
      m.fullCount,
      m.partialCount,
      m.invoiceCount,
      m.totalAmount,
    ]);
    const detailHeaders = [
      "Date",
      "Month",
      "Invoice Number",
      "Customer",
      "Type",
      "Reference",
      "Refund Invoice Number",
      "Amount",
    ];
    const detailLines = refundReportData.details.map((r) => [
      moment(r.date).format("YYYY-MM-DD"),
      r.monthLabel,
      r.invoiceNumber,
      r.customer,
      r.type,
      r.reference,
      r.refundInvoiceNumber,
      r.amount,
    ]);
    const csv = [
      "Monthly Refund Totals",
      monthlyHeaders.join(","),
      ...monthlyLines.map((row) => row.map(csvEscape).join(",")),
      "",
      "Refund Details",
      detailHeaders.join(","),
      ...detailLines.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Refund_Report_${moment(dateRange.startDate).format("YYYY-MM-DD")}_to_${moment(dateRange.endDate).format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Refund CSV downloaded");
  };

  // Helper function to convert oklch colors in cloned document
  const convertOklchColors = (clonedDoc) => {
    try {
      // Get the cloned report element
      const clonedReport = clonedDoc.getElementById("report-content");
      if (!clonedReport) return;
      
      // Force compact PDF layout — html2canvas often ignores stylesheet column rules
      const styleTag = clonedDoc.createElement("style");
      styleTag.textContent = `
        #report-content {
          width: 1120px !important;
          max-width: 1120px !important;
          padding: 8px !important;
          overflow: visible !important;
          background: #ffffff !important;
        }
        #report-content .overflow-x-auto {
          overflow: visible !important;
          width: 1120px !important;
          max-width: 1120px !important;
        }
        #report-content .report-doc-header {
          padding-bottom: 6px !important;
          margin-bottom: 6px !important;
        }
        #report-content .report-doc-header p,
        #report-content .report-doc-header h2 {
          margin: 0 !important;
          line-height: 1.2 !important;
        }
        #report-content table.invoice-report-table {
          width: 1100px !important;
          min-width: 1100px !important;
          max-width: 1100px !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          font-size: 8px !important;
          line-height: 1.1 !important;
        }
        #report-content table.invoice-report-table th,
        #report-content table.invoice-report-table td {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: keep-all !important;
          padding: 1px 3px !important;
          height: 14px !important;
          max-height: 16px !important;
          line-height: 1.1 !important;
          font-size: 8px !important;
          vertical-align: middle !important;
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        #report-content table.invoice-report-table th {
          font-size: 7px !important;
          font-weight: 600 !important;
          color: #64748b !important;
          padding: 2px 3px !important;
          height: 18px !important;
          max-height: 22px !important;
          white-space: normal !important;
          line-height: 1.05 !important;
        }
        #report-content table.invoice-report-table .cell-date {
          width: 58px !important;
          max-width: 58px !important;
        }
        #report-content table.invoice-report-table .cell-invoice {
          width: 155px !important;
          max-width: 155px !important;
        }
        #report-content table.invoice-report-table .cell-receipt {
          width: 108px !important;
          max-width: 108px !important;
        }
        #report-content table.invoice-report-table .cell-vsdc {
          width: 128px !important;
          max-width: 128px !important;
        }
        #report-content table.invoice-report-table .cell-customer {
          width: 110px !important;
          max-width: 110px !important;
        }
        #report-content table.invoice-report-table .cell-amount {
          width: 48px !important;
          max-width: 48px !important;
          text-align: right !important;
          padding-left: 1px !important;
          padding-right: 1px !important;
        }
        #report-content .report-cell-text {
          display: inline !important;
          white-space: nowrap !important;
          line-height: 1.1 !important;
          font-size: inherit !important;
        }
        #report-content table.invoice-report-table tbody tr.report-row-alt td {
          background: #f0f7fc !important;
        }
        #report-content table.invoice-report-table tbody tr.report-group-row td {
          background: #e8f1f8 !important;
          font-weight: 600 !important;
          height: 16px !important;
          padding: 2px 3px !important;
        }
        #report-content table.invoice-report-table tbody tr.report-subtotal-row td,
        #report-content table.invoice-report-table tbody tr.report-grand-row td {
          font-weight: 700 !important;
          height: 16px !important;
          padding: 2px 3px !important;
        }
      `;
      clonedDoc.head.appendChild(styleTag);

      const widthByClass = {
        "cell-date": "58px",
        "cell-invoice": "155px",
        "cell-receipt": "108px",
        "cell-vsdc": "128px",
        "cell-customer": "110px",
        "cell-amount": "48px",
      };
      clonedReport.querySelectorAll("table.invoice-report-table th, table.invoice-report-table td").forEach((cell) => {
        cell.style.setProperty("padding", "1px 3px", "important");
        cell.style.setProperty("height", "14px", "important");
        cell.style.setProperty("line-height", "1.1", "important");
        cell.style.setProperty("font-size", cell.tagName === "TH" ? "7px" : "8px", "important");
        cell.style.setProperty(
          "white-space",
          cell.classList.contains("cell-amount") && cell.tagName === "TH" ? "normal" : "nowrap",
          "important"
        );
        cell.style.setProperty("overflow", "hidden", "important");
        cell.style.setProperty("text-overflow", "ellipsis", "important");
        Object.entries(widthByClass).forEach(([cls, width]) => {
          if (cell.classList.contains(cls)) {
            cell.style.setProperty("width", width, "important");
            cell.style.setProperty("max-width", width, "important");
            if (cls === "cell-amount") {
              cell.style.setProperty("text-align", "right", "important");
            }
          }
        });
      });
      const clonedTable = clonedReport.querySelector("table.invoice-report-table");
      if (clonedTable) {
        clonedTable.style.setProperty("width", "1100px", "important");
        clonedTable.style.setProperty("min-width", "1100px", "important");
        clonedTable.style.setProperty("table-layout", "fixed", "important");
      }
      
      // Get all elements including the root
      const allElements = [clonedReport, ...Array.from(clonedDoc.querySelectorAll("*"))];
      
      // Function to get RGB value from a color (handles oklch conversion)
      const getRgbColor = (colorValue) => {
        if (!colorValue || colorValue === "transparent" || colorValue === "none" || colorValue === "inherit") {
          return colorValue;
        }
        
        // If it's already rgb/rgba/hex, return as is
        if (colorValue.match(/^(rgb|rgba|#)/)) {
          return colorValue;
        }
        
        // If it contains oklch/oklab, we need to convert it
        if (colorValue.includes("oklch") || colorValue.includes("oklab")) {
          // Create a temporary element to get computed RGB
          const temp = document.createElement("div");
          temp.style.cssText = `color: ${colorValue}`;
          temp.style.position = "absolute";
          temp.style.visibility = "hidden";
          temp.style.opacity = "0";
          temp.style.pointerEvents = "none";
          document.body.appendChild(temp);
          
          try {
            const computed = window.getComputedStyle(temp);
            const rgbValue = computed.color || colorValue;
            document.body.removeChild(temp);
            return rgbValue;
          } catch (e) {
            if (temp.parentNode) {
              document.body.removeChild(temp);
            }
            return colorValue;
          }
        }
        
        return colorValue;
      };
      
      // Process all elements and set inline styles with RGB values
      allElements.forEach((el) => {
        if (!el || !el.style) return;
        
        try {
          const computed = clonedDoc.defaultView?.getComputedStyle(el);
          if (!computed) return;
          
          // Properties that might contain colors
          const colorProps = [
            'color',
            'background-color',
            'border-color',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'outline-color',
            'text-decoration-color',
            'column-rule-color'
          ];
          
          colorProps.forEach(prop => {
            try {
              const value = computed.getPropertyValue(prop);
              if (value && value.trim() && value !== "inherit" && value !== "initial") {
                // Always set the computed RGB value as inline style to override CSS
                const rgbValue = getRgbColor(value);
                if (rgbValue && rgbValue !== value) {
                  el.style.setProperty(prop, rgbValue, "important");
                } else if (!value.includes("oklch") && !value.includes("oklab")) {
                  // Even if not oklch, set it as inline style to ensure it's used
                  el.style.setProperty(prop, value, "important");
                }
              }
            } catch (e) {
              // Skip this property if there's an error
            }
          });
        } catch (e) {
          // Skip this element if there's an error
        }
      });
    } catch (error) {
      console.warn("Error converting oklch colors:", error);
      // Continue even if conversion fails - html2canvas might still work
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const isInvoiceJournal = reportType === "invoice-report";
      const reportElement = isInvoiceJournal
        ? document.getElementById("invoice-journal-report")
        : document.getElementById("report-content");
      if (!reportElement) {
        toast.error("Report content not found");
        return;
      }

      toast.loading("Generating PDF...", { id: "pdf-generating" });

      let html2pdfFn;
      try {
        const html2pdfModule = await import("html2pdf.js/dist/html2pdf.js");
        html2pdfFn = html2pdfModule.default || html2pdfModule.html2pdf || html2pdfModule;
      } catch (e1) {
        try {
          const html2pdfModule = await import("html2pdf.js");
          html2pdfFn = html2pdfModule.default || html2pdfModule.html2pdf || html2pdfModule;
        } catch (e2) {
          console.error("html2pdf import errors:", e1, e2);
          throw new Error(`Failed to load PDF library: ${e2?.message || e1?.message || "Unknown error"}`);
        }
      }

      if (!html2pdfFn || typeof html2pdfFn !== "function") {
        throw new Error("PDF library loaded but is not a function. Please refresh the page.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      const reportTypeName = isInvoiceJournal
        ? "Invoice_Journal_Report"
        : reportTypes.find((r) => r.id === reportType)?.name || "Report";
      const fileName = `${reportTypeName}_${moment(dateRange.startDate).format("YYYY-MM-DD")}_to_${moment(
        dateRange.endDate
      ).format("YYYY-MM-DD")}.pdf`;

      const captureWidth = isInvoiceJournal ? 1100 : Math.max(reportElement.scrollWidth, 1000);

      const opt = {
        margin: isInvoiceJournal ? [8, 8, 8, 8] : [6, 6, 6, 6],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: captureWidth,
          windowWidth: captureWidth,
          windowHeight: Math.max(reportElement.scrollHeight, 600),
          allowTaint: true,
          onclone: (clonedDoc) => {
            if (isInvoiceJournal) {
              const style = clonedDoc.createElement("style");
              style.textContent = INVOICE_JOURNAL_CSS;
              clonedDoc.head.appendChild(style);
              const journal = clonedDoc.getElementById("invoice-journal-report");
              if (journal) {
                journal.style.width = "1100px";
                journal.style.maxWidth = "1100px";
                journal.style.background = "#ffffff";
              }
              return;
            }
            convertOklchColors(clonedDoc);
          },
          ignoreElements: (element) => element.classList?.contains("no-print") || false,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape",
        },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdfFn().set(opt).from(reportElement).save();
      toast.success("PDF downloaded successfully", { id: "pdf-generating" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(`Failed to generate PDF: ${error.message || "Unknown error"}.`, {
        id: "pdf-generating",
        duration: 5000,
      });
    }
  };

  const handleGenerateReport = () => {
    if (!draftDateRange.startDate || !draftDateRange.endDate) {
      toast.error("Please select both a start and end date.");
      return;
    }
    if (moment(draftDateRange.startDate).isAfter(moment(draftDateRange.endDate), "day")) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    setDateRange({ ...draftDateRange });
    setFilters({ ...draftFilters });
    setRefreshTrigger((t) => t + 1);
    toast.success("Report generated for the selected filters.");
    requestAnimationFrame(() => {
      document.getElementById("report-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmitToGRA = async () => {
    if (!user?.graCredentialsConfigured) {
      toast.error("Configure GRA credentials in Settings → Company (Company Reference and Security Key) to submit to GRA.");
      return;
    }
    setSubmitting(true);
    setGraSubmission(null);
    try {
      // GRA E‑VAT API VER 8.2 does not expose a VAT-return endpoint. The closest supported flow
      // for submitting a period summary is "Statement of Account" (grouped invoices).
      const groupReferenceId = `GRP-${moment(dateRange.startDate).format("YYYYMMDD")}-${moment(dateRange.endDate).format("YYYYMMDD")}`;
      const invoicesForVat = filteredInvoices.filter((inv) => (inv.type || "invoice") !== "proforma" && (inv.type || "invoice") !== "quotation");

      const payload = {
        currency: (userCurrency || "GHS").toUpperCase(),
        exchangeRate: 1,
        totalVat: reportData.summary.totalVat,
        totalAmount: reportData.summary.totalSales,
        totalLevies: reportData.summary.totalLevies,
        userName: user?.businessName || user?.name || "User",
        businessPartnerName: "Tax period",
        businessPartnerTin: "C0000000000",
        groupReferenceId,
        transactionDate: new Date().toISOString(),
        calculationType: "INCLUSIVE",
        groupInvoiceLines: invoicesForVat.map((inv) => ({
          currency: (userCurrency || "GHS").toUpperCase(),
          exchangeRate: 1,
          calculationType: (inv.vatScenario || "inclusive") === "exclusive" ? "EXCLUSIVE" : "INCLUSIVE",
          invoiceNumber: inv.invoiceNumber,
          reference: inv.graRefundReference || "",
          flag: "INVOICE",
          invoiceVat: Number(inv.totalVat || 0),
          invoiceAmount: Number(inv.grandTotal || 0),
          invoiceLevies:
            Number(inv.totalNhil || 0) +
            Number(inv.totalGetFund || 0) +
            Number(inv.totalCst || 0) +
            Number(inv.totalTourism || 0),
          transactionDate: inv.invoiceDate || new Date().toISOString(),
        })),
      };

      const response = await axiosInstance.post(API_PATHS.GRA.STATEMENT_OF_ACCOUNT, payload);
      const data = response?.data ?? response;
      setGraSubmission(data);
      toast.success(`Successfully submitted to GRA! Group Ref: ${groupReferenceId}`, { duration: 5000 });
    } catch (error) {
      console.error("GRA Submission Error:", error);
      toast.error(
        error.response?.data?.message || error.message || "Failed to submit to GRA. Please try again.",
        { duration: 5000 }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 w-full max-w-full p-6 print:p-0 print-report-wrapper">
      {/* Header */}
      <div className="mb-7 print:hidden no-print">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-gray-600 dark:text-white mt-2">
          Generate invoice, sales, tax, payment, and refund reports with PDF, Word, CSV, and Excel export
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-6 print:hidden no-print">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => handleSelectReportType(type.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left dark:bg-slate-900 ${
                  reportType === type.id
                    ? "border-blue-600 bg-blue-50 dark:bg-slate-800 dark:border-blue-500"
                    : "border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500"
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${reportType === type.id ? "text-blue-600" : "text-gray-600 dark:text-slate-200"}`} />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{type.name}</h3>
                <p className="text-sm text-gray-600 dark:text-white">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 print:hidden no-print">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {lastUpdated && (
              <span>Updated {moment(lastUpdated).format('HH:mm:ss')}</span>
            )}
            <Filter className="w-5 h-5 text-gray-600" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={draftDateRange.startDate}
              onChange={(e) => {
                setDraftDateRange({ ...draftDateRange, startDate: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={draftDateRange.endDate}
              onChange={(e) => {
                setDraftDateRange({ ...draftDateRange, endDate: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <select
              value={draftFilters.customer}
              onChange={(e) => setDraftFilters({ ...draftFilters, customer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              {Array.from(new Set(invoices.map((inv) => getCustomerName(inv)))).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={draftFilters.status}
              onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="fully-paid">Fully Paid</option>
              <option value="partially-paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            onClick={handleGenerateReport}
            className="px-4 py-4 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button
            onClick={() => {
              const currentMonth = {
                startDate: moment().startOf('month').format('YYYY-MM-DD'),
                endDate: moment().endOf('month').format('YYYY-MM-DD')
              };
              const clearedFilters = { customer: "all", status: "all", paymentMethod: "all" };
              setDraftDateRange(currentMonth);
              setDraftFilters(clearedFilters);
              setDateRange(currentMonth);
              setFilters(clearedFilters);
            }}
            variant="outline"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full max-w-full min-w-0 overflow-x-auto report-landscape-preview" id="report-content">
        {loading && (
          <div className="text-sm text-gray-500 mb-4">Loading live data...</div>
        )}
        {/* Report Header */}
        {/* Report Header — hidden for Invoice Journal (has its own header) */}
        {reportType !== "invoice-report" && (
        <div className="report-doc-header border-b border-slate-200 pb-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              {companyDetails.name && (
                <p className="text-sm font-semibold text-slate-900">{companyDetails.name}</p>
              )}
              <div className="mt-0.5 space-y-0 text-[11px] text-slate-500 leading-snug">
                {companyDetails.tin && <p>TIN: {companyDetails.tin}</p>}
                {companyDetails.address && <p>{companyDetails.address}</p>}
                {companyDetails.phone && <p>Tel: {companyDetails.phone}</p>}
                {companyDetails.email && <p>Email: {companyDetails.email}</p>}
              </div>
              <h2 className="text-base font-semibold text-slate-900 mt-3">
                {reportTypes.find(r => r.id === reportType)?.name}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Period: {moment(dateRange.startDate).format('MMM DD, YYYY')} - {moment(dateRange.endDate).format('MMM DD, YYYY')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-500">Generated on</p>
              <p className="text-[11px] font-medium text-slate-800">{moment().format('MMM DD, YYYY HH:mm')}</p>
            </div>
          </div>
        </div>
        )}

        {/* Sales Summary Report */}
        {reportType === "sales" && (
          <div>
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary (Spreadsheet View)</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase border border-gray-300">Metric</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase border border-gray-300">Value</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase border border-gray-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">Total Revenue (Paid)</td>
                      <td className="py-2 px-3 text-sm font-semibold text-gray-900 border border-gray-200">{formatCurrency(reportData.summary.totalRevenue, userCurrency)}</td>
                      <td className="py-2 px-3 text-sm text-gray-700 border border-gray-200">Collected from fully paid invoices</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">Total Invoices</td>
                      <td className="py-2 px-3 text-sm font-semibold text-gray-900 border border-gray-200">{reportData.summary.totalInvoices}</td>
                      <td className="py-2 px-3 text-sm text-gray-700 border border-gray-200">
                        {reportData.summary.paidInvoices} paid, {reportData.summary.pendingInvoices} pending
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">Total Unpaid</td>
                      <td className="py-2 px-3 text-sm font-semibold text-gray-900 border border-gray-200">{formatCurrency(reportData.summary.totalUnpaidAmount, userCurrency)}</td>
                      <td className="py-2 px-3 text-sm text-gray-700 border border-gray-200">Tax total: {formatCurrency(reportData.summary.totalTax, userCurrency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Customers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topCustomers.map((customer, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">{customer.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(customer.revenue, userCurrency)}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{customer.invoices}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tax Report (GRA) */}
        {reportType === "tax" && (
          <div>
            <div className="bg-yellow-50 dark:bg-slate-900 border border-yellow-200 dark:border-slate-700 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <FileCheck className="w-5 h-5 text-yellow-700 dark:text-yellow-300 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">GRA Tax Report</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    This report is formatted for Ghana Revenue Authority (GRA) submission
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Tax Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] divide-y divide-blue-200">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-blue-800">Metric</th>
                        <th className="py-2 text-xs font-semibold uppercase tracking-wide text-blue-800">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">Total Taxable Sales</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.taxableSales, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">Total Tax Collected (VAT + Levies)</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalTax, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">Standard Rate VAT (15%)</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalVat, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">NHIL (2.5%)</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalNhil, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">GETFUND (2.5%)</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalGetFund, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">Total Levies</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalLevies, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">Zero-Rated Sales</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(0, userCurrency)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-blue-700">Exempt Sales</td>
                        <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(0, userCurrency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GRA Submission Result */}
              {graSubmission && graSubmission.response?.status === "SUCCESS" && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start mb-4">
                    <FileCheck className="w-6 h-6 text-green-600 mt-1 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Successfully Submitted to GRA</h3>
                      <p className="text-sm text-green-700 mt-1">Your statement of account has been registered with the Ghana Revenue Authority</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Reference</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.message?.num || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">VSDC ID</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.message?.ysdcid || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Receipt Number</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.message?.ysdcrecnum || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Submission Time</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.message?.ysdctime || 'N/A'}</p>
                    </div>
                  </div>

                  {/* QR Code */}
                  {graSubmission.response.qr_code && (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm font-medium text-gray-900 mb-3">Verification QR Code</p>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="flex-shrink-0">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(graSubmission.response.qr_code)}`}
                            alt="GRA Verification QR Code"
                            className="w-32 h-32 border border-gray-300 rounded"
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="text-xs text-gray-600 mb-2">Scan this QR code to verify the submission on GRA portal</p>
                          <a 
                            href={graSubmission.response.qr_code}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 underline"
                          >
                            Verify on GRA Portal →
                          </a>
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">Internal Data:</p>
                            <p className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">
                              {graSubmission.response.message?.ysdcintdata}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={() => window.print()}
                      variant="outline"
                      className="text-sm"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Receipt
                    </Button>
                    <Button
                      onClick={() => setGraSubmission(null)}
                      variant="outline"
                      className="text-sm"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Report */}
        {reportType === "customer" && (
          <div>
            <p className="text-gray-600 mb-4">Detailed customer analysis and activity report</p>
            {reportData.customers.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No customer activity for this period</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Activity</h3>
                  <p className="text-sm text-gray-600">Total order amount and order frequency per customer</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Order Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Orders (Frequency)</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Average Order Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.customers.map((customer, index) => (
                        <tr key={`${customer.name}-${index}`}>
                          <td className="py-3 px-4 text-sm text-gray-600">{index + 1}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{customer.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(customer.revenue, userCurrency)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{customer.invoices}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {formatCurrency(customer.invoices > 0 ? customer.revenue / customer.invoices : 0, userCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Report */}
        {reportType === "payment" && (
          <div>
            <p className="text-gray-700 dark:text-slate-300 mb-4">Payment tracking and collection report</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3">Payment Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] divide-y divide-blue-200">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-blue-800">Metric</th>
                      <th className="py-2 text-xs font-semibold uppercase tracking-wide text-blue-800">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Total Paid</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalRevenue, userCurrency)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Total Unpaid</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.totalUnpaidAmount, userCurrency)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Total Invoices</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{reportData.summary.totalInvoices}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Paid Invoices</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{reportData.summary.paidInvoices}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Unpaid Invoices</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{reportData.summary.pendingInvoices}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Refunded Invoices</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{reportData.summary.refundedInvoices}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-sm text-blue-700">Refunded Amount</td>
                      <td className="py-2 text-sm font-semibold text-blue-900">{formatCurrency(reportData.summary.refundedAmount, userCurrency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payment records for this period</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                  <p className="text-sm text-gray-600">Invoice payment details and status</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Refund</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice._id}>
                          <td className="py-3 px-4 text-sm">
                            <Link to={`/invoices/${invoice._id}`} className="report-link">
                              {invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{getCustomerName(invoice)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(Number(invoice.grandTotal || 0), userCurrency)}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (invoice.status || "").toLowerCase() === "fully paid" || (invoice.status || "").toLowerCase() === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : (invoice.status || "").toLowerCase() === "partially paid"
                                ? "bg-[#B8860B] text-white"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {invoice.status || "Unpaid"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {Array.isArray(invoice.refundEvents) && invoice.refundEvents.some((ev) => !ev?.cancelled) ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Refunded
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {invoice.dueDate ? moment(invoice.dueDate).format("MMM DD, YYYY") : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refund Report — monthly totals */}
        {reportType === "refund" && (
          <div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-rose-900 mb-3">Refund Summary</h4>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-sm text-rose-700">Total Refunded</td>
                    <td className="py-2 text-sm font-semibold text-rose-900">
                      {formatCurrency(refundReportData.summary.totalAmount, userCurrency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-sm text-rose-700">Refund Events</td>
                    <td className="py-2 text-sm font-semibold text-rose-900">{refundReportData.summary.refundCount}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-sm text-rose-700">Full / Partial</td>
                    <td className="py-2 text-sm font-semibold text-rose-900">
                      {refundReportData.summary.fullCount} / {refundReportData.summary.partialCount}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-sm text-rose-700">Invoices Refunded</td>
                    <td className="py-2 text-sm font-semibold text-rose-900">{refundReportData.summary.invoiceCount}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-sm text-rose-700">Months Covered</td>
                    <td className="py-2 text-sm font-semibold text-rose-900">{refundReportData.summary.monthCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {refundReportData.months.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Undo2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No refunds found for the selected period</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Monthly Refund Totals</h3>
                    <p className="text-sm text-gray-600">Total refunds grouped by month</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Month</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Refunds</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Full</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Partial</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoices</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Refunded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {refundReportData.months.map((month) => (
                          <tr key={month.monthKey}>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{month.monthLabel}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{month.refundCount}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{month.fullCount}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{month.partialCount}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{month.invoiceCount}</td>
                            <td className="py-3 px-4 text-sm text-right font-semibold text-rose-700">
                              {formatCurrency(month.totalAmount, userCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900" colSpan={5}>
                            Grand Total
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-rose-800">
                            {formatCurrency(refundReportData.summary.totalAmount, userCurrency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Refund Details</h3>
                    <p className="text-sm text-gray-600">Individual refund events in the selected period</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice #</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {refundReportData.details.map((row) => (
                          <tr key={row.id}>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {moment(row.date).format("MMM DD, YYYY")}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">{row.invoiceNumber}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{row.customer}</td>
                            <td className="py-3 px-4 text-sm">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  row.type === "Partial"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 font-mono text-xs">{row.reference}</td>
                            <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                              {formatCurrency(row.amount, userCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Invoice Journal Report — same markup used for PDF / Word / Excel */}
        {reportType === "invoice-report" && (
          <div className="w-full min-w-0 overflow-x-auto bg-white">
            {invoiceReportGroups.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No invoices found for the selected period and filters.</p>
              </div>
            ) : (
              <div
                className="invoice-journal-host"
                dangerouslySetInnerHTML={{ __html: invoiceJournalHtml }}
              />
            )}
          </div>
        )}

        {/* ZD Daily Report */}
        {reportType === "zd-daily" && (
          <div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-indigo-900 mb-1">ZD Daily Summary</h4>
              <p className="text-sm text-indigo-700">
                Reporting date: {moment(zdDailyData.reportDate).format("MMM DD, YYYY")}
              </p>
            </div>

            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-[620px] border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase border border-gray-300">Metric</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase border border-gray-300">Value</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase border border-gray-300">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">Daily Sales</td>
                    <td className="py-2 px-3 text-sm font-semibold text-gray-900 border border-gray-200">{formatCurrency(zdDailyData.summary.totalSales, userCurrency)}</td>
                    <td className="py-2 px-3 text-sm text-gray-700 border border-gray-200">
                      Net after refunds: {formatCurrency(zdDailyData.summary.netSalesAfterRefunds, userCurrency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">Invoices</td>
                    <td className="py-2 px-3 text-sm font-semibold text-gray-900 border border-gray-200">{zdDailyData.summary.totalInvoices}</td>
                    <td className="py-2 px-3 text-sm text-gray-700 border border-gray-200">
                      {zdDailyData.summary.stampedInvoices} stamped, {zdDailyData.summary.unstampedInvoices} unstamped
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">Taxes & Levies</td>
                    <td className="py-2 px-3 text-sm font-semibold text-gray-900 border border-gray-200">
                      {formatCurrency(zdDailyData.summary.totalVat + zdDailyData.summary.totalLevies, userCurrency)}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700 border border-gray-200">
                      VAT {formatCurrency(zdDailyData.summary.totalVat, userCurrency)} / Levies {formatCurrency(zdDailyData.summary.totalLevies, userCurrency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {zdDailyData.dailyInvoices.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No invoice activity for the selected report date.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Stamping Activity</h3>
                  <p className="text-sm text-gray-600">Daily invoice stamping status snapshot</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stamp Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Receipt #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Receipt Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {zdDailyData.dailyInvoices.map((invoice) => {
                        const stamped = Boolean(
                          invoice?.graReceiptNumber ||
                            invoice?.graVerificationCode ||
                            invoice?.graStatus === "SUCCESS" ||
                            invoice?.graStatus === "APPROVED"
                        );
                        return (
                          <tr key={invoice._id}>
                            <td>
                              <Link to={`/invoices/${invoice._id}`} className="report-link">
                                {invoice.invoiceNumber}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">{getCustomerName(invoice)}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {formatCurrency(Number(invoice.grandTotal || 0), userCurrency)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  stamped ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {stamped ? "Stamped" : "Not Stamped"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">{invoice.graReceiptNumber || "-"}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {invoice.graReceiptDateTime
                                ? moment(invoice.graReceiptDateTime).format("MMM DD, YYYY HH:mm")
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 no-print">
        <Button
          onClick={handlePrint}
          className="px-2 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
        <Button
          onClick={handleDownloadPDF}
          className="px-2 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition"
        >
          <Download className="w-5 h-4 mr-2" />
          Download PDF
        </Button>
        {reportType === "invoice-report" && (
          <>
            <Button
              onClick={handleExportInvoiceWord}
              className="px-2 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition"
            >
              <Download className="w-5 h-4 mr-2" />
              Download Word
            </Button>
            <Button
              onClick={handleExportInvoiceCsv}
              className="px-2 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white transition"
            >
              <Download className="w-5 h-4 mr-2" />
              Download CSV
            </Button>
            <Button
              onClick={handleExportInvoiceExcel}
              className="px-2 py-2 rounded bg-teal-600 hover:bg-teal-700 text-white transition"
            >
              <Download className="w-5 h-4 mr-2" />
              Download Excel
            </Button>
          </>
        )}
        {reportType === "refund" && (
          <Button
            onClick={handleExportRefundCsv}
            className="px-2 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white transition"
          >
            <Download className="w-5 h-4 mr-2" />
            Download CSV
          </Button>
        )}
      </div>

      {/* Report + Print Styles — soft list look for all report formats */}
      <style>{`
        ${INVOICE_JOURNAL_CSS}

        .invoice-journal-host {
          width: 100%;
          overflow-x: auto;
          background: #fff;
        }

        #report-content {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #334155;
        }

        #report-content .report-table,
        #report-content table:not(.invoice-report-table) {
          width: 100%;
          border-collapse: collapse;
          border: none !important;
          font-size: 10px;
          line-height: 1.2;
          color: #334155;
        }

        #report-content table thead th {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid #cfd8e3 !important;
          color: #64748b !important;
          font-size: 9px !important;
          font-weight: 600 !important;
          letter-spacing: 0.01em;
          text-transform: none !important;
          padding: 4px 6px !important;
          white-space: nowrap;
          vertical-align: middle;
          line-height: 1.15;
          max-height: 1.6em;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #report-content table tbody td {
          border: none !important;
          border-bottom: 1px solid #eef2f7 !important;
          padding: 3px 6px !important;
          font-size: 10px !important;
          color: #334155 !important;
          vertical-align: middle;
          background: transparent;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          height: 1.55rem;
        }

        #report-content table:not(.invoice-report-table) tbody td {
          max-width: 9.5rem;
        }

        #report-content .report-cell-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          line-height: 1.2;
        }

        #report-content table tbody tr.report-row,
        #report-content table tbody tr:nth-child(odd):not(.report-group-row):not(.report-subtotal-row):not(.report-grand-row) {
          background: #ffffff !important;
        }

        #report-content table tbody tr.report-row-alt,
        #report-content table tbody tr:nth-child(even):not(.report-group-row):not(.report-subtotal-row):not(.report-grand-row) {
          background: #f0f7fc !important;
        }

        #report-content table tbody tr.report-group-row td {
          background: #e8f1f8 !important;
          color: #0f172a !important;
          font-weight: 600 !important;
          font-size: 10px !important;
          border-bottom: 1px solid #d7e6f2 !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #report-content table tbody tr.report-subtotal-row td {
          background: #f8fafc !important;
          color: #0f172a !important;
          font-weight: 600 !important;
          border-top: 1px solid #e2e8f0 !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }

        #report-content table tbody tr.report-grand-row td {
          background: #e0f2fe !important;
          color: #0f172a !important;
          font-weight: 700 !important;
          border-top: 1px solid #bae6fd !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }

        #report-content .report-link {
          color: #1d4ed8 !important;
          text-decoration: underline;
          font-weight: 500;
        }

        #report-content .invoice-report-table {
          table-layout: fixed !important;
          min-width: 1180px !important;
          width: 1180px !important;
        }

        #report-content .invoice-report-table th,
        #report-content .invoice-report-table td {
          word-break: normal !important;
          overflow-wrap: normal !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        #report-content .invoice-report-table th {
          font-size: 8.5px !important;
          line-height: 1.1 !important;
          white-space: nowrap !important;
        }

        /* Amount columns — compact */
        #report-content .invoice-report-table td:nth-child(n+7),
        #report-content .invoice-report-table th:nth-child(n+7) {
          width: 64px !important;
          max-width: 64px !important;
          padding-left: 2px !important;
          padding-right: 2px !important;
        }

        #report-content .invoice-report-table th:nth-child(n+7) {
          white-space: normal !important;
          line-height: 1.05 !important;
        }

        /* Text / ID columns — wider */
        #report-content .invoice-report-table td:nth-child(1),
        #report-content .invoice-report-table th:nth-child(1),
        #report-content .invoice-report-table td:nth-child(2),
        #report-content .invoice-report-table th:nth-child(2) {
          width: 72px !important;
          max-width: 72px !important;
        }

        #report-content .invoice-report-table td:nth-child(3),
        #report-content .invoice-report-table th:nth-child(3) {
          width: 168px !important;
          max-width: 168px !important;
        }

        #report-content .invoice-report-table td:nth-child(4),
        #report-content .invoice-report-table th:nth-child(4) {
          width: 128px !important;
          max-width: 128px !important;
        }

        #report-content .invoice-report-table td:nth-child(5),
        #report-content .invoice-report-table th:nth-child(5) {
          width: 148px !important;
          max-width: 148px !important;
        }

        #report-content .invoice-report-table td:nth-child(6),
        #report-content .invoice-report-table th:nth-child(6) {
          width: 132px !important;
          max-width: 132px !important;
        }

        #report-content h3,
        #report-content h4 {
          font-size: 13px !important;
          font-weight: 600;
          color: #0f172a;
        }

        #report-content p {
          font-size: 11px;
        }

        @media print {
          * {
            visibility: hidden;
          }

          #report-content,
          #report-content * {
            visibility: visible !important;
          }

          .no-print,
          .print\\:hidden,
          .print-report-wrapper > *:not(#report-content) {
            display: none !important;
            visibility: hidden !important;
          }

          @page {
            size: A4 landscape !important;
            margin: 0.4in;
          }

          body.report-print-page,
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          aside,
          header:not(#report-content),
          nav,
          .flex-1 > header {
            display: none !important;
            visibility: hidden !important;
          }

          .print-report-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0.5rem !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            overflow: visible !important;
          }

          #report-content .rounded-lg,
          #report-content .shadow-sm,
          #report-content .border {
            border-radius: 0 !important;
            box-shadow: none !important;
            border-color: transparent !important;
          }

          #report-content svg {
            display: none !important;
          }

          #report-content table {
            min-width: 0 !important;
            width: 100% !important;
            font-size: 7.5pt !important;
            line-height: 1.15 !important;
            page-break-inside: auto;
            border-collapse: collapse !important;
            border: none !important;
          }

          #report-content .invoice-report-table {
            table-layout: fixed !important;
            width: 100% !important;
            min-width: 0 !important;
            font-size: 7pt !important;
          }

          #report-content .invoice-report-table th,
          #report-content .invoice-report-table td {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            word-break: normal !important;
          }

          #report-content table thead th {
            background: transparent !important;
            color: #475569 !important;
            border: none !important;
            border-bottom: 1px solid #94a3b8 !important;
            font-size: 6.5pt !important;
            padding: 2px 4px !important;
            text-transform: none !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          #report-content table tbody td {
            border: none !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 2px 4px !important;
            font-size: 7pt !important;
            color: #334155 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            height: 1.3rem !important;
            line-height: 1.15 !important;
          }

          #report-content table tbody tr.report-row,
          #report-content table tbody tr:nth-child(odd):not(.report-group-row):not(.report-subtotal-row):not(.report-grand-row) {
            background: #ffffff !important;
          }

          #report-content table tbody tr.report-row-alt,
          #report-content table tbody tr:nth-child(even):not(.report-group-row):not(.report-subtotal-row):not(.report-grand-row) {
            background: #f0f7fc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #report-content table tbody tr.report-group-row td {
            background: #e8f1f8 !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #report-content table tbody tr.report-subtotal-row td {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #report-content table tbody tr.report-grand-row td {
            background: #e0f2fe !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #report-content .report-link {
            color: #1d4ed8 !important;
            text-decoration: underline;
          }

          #report-content tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          #report-content thead {
            display: table-header-group;
          }

          #report-content .text-sm.text-gray-500 {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
