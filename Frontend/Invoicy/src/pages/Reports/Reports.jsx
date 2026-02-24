import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Printer, Calendar, TrendingUp, DollarSign, FileCheck, Building2, Filter } from "lucide-react";
import Button from "../../components/ui/Button";
import moment from "moment";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
// html2pdf will be loaded dynamically

const Reports = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || (() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.currency) return parsed.currency;
      }
    } catch (_) {}
    return "GHS";
  })();
  const [reportType, setReportType] = useState("sales");
  const [dateRange, setDateRange] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD')
  });
  const [autoDateRange, setAutoDateRange] = useState(true);
  const [filters, setFilters] = useState({
    customer: "all",
    status: "all",
    paymentMethod: "all"
  });
  const [submitting, setSubmitting] = useState(false);
  const [graSubmission, setGraSubmission] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

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
        if (autoDateRange && data.length > 0) {
          const dates = data.map((inv) => moment(inv.invoiceDate));
          const minDate = moment.min(dates).format('YYYY-MM-DD');
          const maxDate = moment.max(dates).format('YYYY-MM-DD');
          setDateRange({ startDate: minDate, endDate: maxDate });
          setAutoDateRange(false);
        }
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
    const invoicesForVat = filteredInvoices.filter((inv) => (inv.type || "invoice") !== "proforma");

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
      },
      topCustomers,
      customers: allCustomers,
      salesByMonth,
    };
  }, [filteredInvoices]);

  const reportTypes = [
    { id: "sales", name: "Sales Summary", icon: TrendingUp, description: "Overview of all sales" },
    { id: "tax", name: "Tax Report (GRA)", icon: FileCheck, description: "GRA compliance report" },
    { id: "customer", name: "Customer Report", icon: Building2, description: "Customer analysis" },
    { id: "payment", name: "Payment Report", icon: DollarSign, description: "Payment tracking" }
  ];

  const handlePrint = () => {
    window.print();
  };

  // Helper function to convert oklch colors in cloned document
  const convertOklchColors = (clonedDoc) => {
    try {
      // Get the cloned report element
      const clonedReport = clonedDoc.getElementById("report-content");
      if (!clonedReport) return;
      
      // Add a style tag to override oklch colors (as a fallback)
      const styleTag = clonedDoc.createElement("style");
      styleTag.textContent = `
        * {
          /* Force all colors to be computed as RGB */
          color: inherit !important;
          background-color: inherit !important;
          border-color: inherit !important;
        }
      `;
      clonedDoc.head.appendChild(styleTag);
      
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
      const reportElement = document.getElementById("report-content");
      if (!reportElement) {
        toast.error("Report content not found");
        return;
      }

      toast.loading("Generating PDF...", { id: "pdf-generating" });

      // Dynamically import html2pdf
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
        console.error("html2pdfFn type:", typeof html2pdfFn, html2pdfFn);
        throw new Error("PDF library loaded but is not a function. Please refresh the page.");
      }

      // Wait a bit to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add temporary style override to convert oklch colors before PDF generation
      const tempStyle = document.createElement("style");
      tempStyle.id = "pdf-oklch-override";
      tempStyle.textContent = `
        #report-content * {
          /* Force computed colors to be used */
          color: inherit !important;
          background-color: inherit !important;
          border-color: inherit !important;
        }
      `;
      document.head.appendChild(tempStyle);

      const reportTypeName = reportTypes.find(r => r.id === reportType)?.name || "Report";
      const fileName = `${reportTypeName}_${moment(dateRange.startDate).format("YYYY-MM-DD")}_to_${moment(dateRange.endDate).format("YYYY-MM-DD")}.pdf`;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: reportElement.scrollWidth,
          windowHeight: reportElement.scrollHeight,
          allowTaint: true,
          onclone: (clonedDoc) => {
            // Convert oklch colors to rgb in the cloned document
            convertOklchColors(clonedDoc);
          },
          ignoreElements: (element) => {
            // Ignore elements that might cause issues
            return element.classList?.contains("no-print") || false;
          }
        },
        jsPDF: { 
          unit: "in", 
          format: "a4", 
          orientation: "portrait" 
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      try {
        // Use html2pdf with the original element (onclone will handle color conversion)
        const worker = html2pdfFn().set(opt).from(reportElement);
        await worker.save();
        toast.success("PDF downloaded successfully", { id: "pdf-generating" });
      } finally {
        // Remove temporary style override
        const styleToRemove = document.getElementById("pdf-oklch-override");
        if (styleToRemove) {
          styleToRemove.remove();
        }
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        cause: error.cause
      });
      toast.error(`Failed to generate PDF: ${error.message || "Unknown error"}. Please check the console for details.`, { id: "pdf-generating", duration: 5000 });
    }
  };

  const handleGenerateReport = () => {
    // TODO: Call API to fetch report data
    console.log("Generating report:", { reportType, dateRange, filters });
  };

  const handleSubmitToGRA = async () => {
    if (!user?.graCredentialsConfigured) {
      toast.error("Configure GRA credentials in Settings → Company (Company Reference and Security Key) to submit to GRA.");
      return;
    }
    setSubmitting(true);
    try {
      const vatData = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        totalSales: reportData.summary.taxableSales,
        standardRatedSales: reportData.summary.taxableSales,
        zeroRatedSales: 0,
        exemptSales: 0,
        totalVAT: reportData.summary.totalVat,
        standardRateVAT: reportData.summary.totalVat,
        nhil: reportData.summary.totalNhil,
        getFund: reportData.summary.totalGetFund,
        totalLevies: reportData.summary.totalLevies,
        totalTax: reportData.summary.totalTax,
        inputVAT: 0,
        netVAT: reportData.summary.totalVat,
        invoices: [],
      };
      const response = await axiosInstance.post(API_PATHS.GRA.SUBMIT_VAT_RETURN, vatData);
      const data = response?.data ?? response;
      setGraSubmission(data);
      const invoiceNum = data?.response?.mesaage?.num || data?.referenceNumber || "N/A";
      toast.success(`Successfully submitted to GRA! Invoice: ${invoiceNum}`, { duration: 5000 });
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
    <div className="p-6 print:p-0 print-report-wrapper">
      {/* Header */}
      <div className="mb-7 print:hidden no-print">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-gray-600 dark:text-white mt-2">Generate and print sales activity reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-6 print:hidden no-print">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
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
              value={dateRange.startDate}
              onChange={(e) => {
                setAutoDateRange(false);
                setDateRange({ ...dateRange, startDate: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => {
                setAutoDateRange(false);
                setDateRange({ ...dateRange, endDate: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <select
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
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
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
              setDateRange({
                startDate: moment().startOf('month').format('YYYY-MM-DD'),
                endDate: moment().format('YYYY-MM-DD')
              });
              setAutoDateRange(true);
              setFilters({ customer: "all", status: "all", paymentMethod: "all" });
            }}
            variant="outline"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6" id="report-content">
        {loading && (
          <div className="text-sm text-gray-500 mb-4">Loading live data...</div>
        )}
        {/* Report Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {reportTypes.find(r => r.id === reportType)?.name}
              </h2>
              <p className="text-gray-600 mt-1">
                Period: {moment(dateRange.startDate).format('MMM DD, YYYY')} - {moment(dateRange.endDate).format('MMM DD, YYYY')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Generated on</p>
              <p className="font-semibold text-gray-900">{moment().format('MMM DD, YYYY HH:mm')}</p>
            </div>
          </div>
        </div>

        {/* Sales Summary Report */}
        {reportType === "sales" && (
          <div>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 dark:bg-slate-900 rounded-lg p-4 border border-blue-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Revenue (Paid)</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-white mt-1">
                      {formatCurrency(reportData.summary.totalRevenue, userCurrency)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-slate-900 rounded-lg p-4 border border-emerald-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Total Invoices</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-white mt-1">
                      {reportData.summary.totalInvoices}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1">
                      {reportData.summary.paidInvoices} Paid, {reportData.summary.pendingInvoices} Pending
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-emerald-700 dark:text-emerald-300" />
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-slate-900 rounded-lg p-4 border border-purple-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Total Unpaid</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-white mt-1">
                      {formatCurrency(reportData.summary.totalUnpaidAmount, userCurrency)}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-200 mt-1">
                      Tax: {formatCurrency(reportData.summary.totalTax, userCurrency)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-700 dark:text-purple-300" />
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Taxable Sales</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(reportData.summary.taxableSales, userCurrency)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Tax Collected (VAT + Levies)</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(reportData.summary.totalTax, userCurrency)}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Tax Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Standard Rate VAT (15%)</span>
                    <span className="font-medium text-blue-900">{formatCurrency(reportData.summary.totalVat, userCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">NHIL (2.5%)</span>
                    <span className="font-medium text-blue-900">{formatCurrency(reportData.summary.totalNhil, userCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">GETFUND (2.5%)</span>
                    <span className="font-medium text-blue-900">{formatCurrency(reportData.summary.totalGetFund, userCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Total Levies</span>
                    <span className="font-medium text-blue-900">{formatCurrency(reportData.summary.totalLevies, userCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Zero-Rated Sales</span>
                    <span className="font-medium text-blue-900">{formatCurrency(0, userCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Exempt Sales</span>
                    <span className="font-medium text-blue-900">{formatCurrency(0, userCurrency)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleSubmitToGRA}
                  disabled={submitting}
                  className="px-2 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting to GRA..." : "Submit to GRA"}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Company Reference: {user?.graCompanyReference || "Not set (configure in Settings → Company)"}
                </p>
              </div>

              {/* GRA Submission Result */}
              {graSubmission && graSubmission.response?.status === "SUCCESS" && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start mb-4">
                    <FileCheck className="w-6 h-6 text-green-600 mt-1 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Successfully Submitted to GRA</h3>
                      <p className="text-sm text-green-700 mt-1">Your tax return has been registered with the Ghana Revenue Authority</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Invoice Number</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.mesaage?.num || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">VSDC ID</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.mesaage?.ysdcid || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Receipt Number</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.mesaage?.ysdcrecnum || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Submission Time</p>
                      <p className="text-sm font-semibold text-gray-900">{graSubmission.response.mesaage?.ysdctime || 'N/A'}</p>
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
                              {graSubmission.response.mesaage?.ysdcintdata}
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
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Order Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Orders (Frequency)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.customers.map((customer, index) => (
                        <tr key={`${customer.name}-${index}`} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{customer.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(customer.revenue, userCurrency)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{customer.invoices}</td>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-emerald-50 dark:bg-slate-900 rounded-lg p-4 border border-emerald-200 dark:border-slate-700">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-white mt-1">{formatCurrency(reportData.summary.totalRevenue, userCurrency)}</p>
              </div>
              <div className="bg-red-50 dark:bg-slate-900 rounded-lg p-4 border border-red-200 dark:border-slate-700">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">Total Unpaid</p>
                <p className="text-2xl font-bold text-red-900 dark:text-white mt-1">{formatCurrency(reportData.summary.totalUnpaidAmount, userCurrency)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-slate-900 rounded-lg p-4 border border-blue-200 dark:border-slate-700">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Invoices</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white mt-1">{reportData.summary.totalInvoices}</p>
                <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">{reportData.summary.paidInvoices} Paid, {reportData.summary.pendingInvoices} Unpaid</p>
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
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice._id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{invoice.invoiceNumber}</td>
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
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 no-print">
        <Button
          onClick={handlePrint}
          className="px-2 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
        <Button
          onClick={handleDownloadPDF}
          className="px-2 py- 2 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition"
        >
          <Download className="w-5 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide everything except report content */
          * {
            visibility: hidden;
          }
          
          /* Show only report content */
          #report-content,
          #report-content * {
            visibility: visible !important;
          }
          
          /* Hide all non-report elements */
          .no-print,
          .print\\:hidden,
          .print-report-wrapper > *:not(#report-content) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Reset body and page */
          @page {
            margin: 0.5in;
          }
          
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          /* Hide layout elements */
          aside,
          header:not(#report-content),
          nav,
          .flex-1 > header {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Page wrapper - no padding, full width */
          .print-report-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Report content - only visible element */
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1rem !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            page-break-inside: avoid;
          }
          
          /* Ensure text is black and readable */
          #report-content,
          #report-content * {
            color: #000 !important;
            background: white !important;
          }
          
          /* Hide dark mode backgrounds */
          #report-content .dark\\:bg-slate-900,
          #report-content .dark\\:bg-slate-800,
          #report-content .dark\\:bg-slate-700 {
            background: white !important;
          }
          
          /* Ensure tables print properly */
          #report-content table {
            page-break-inside: auto;
            border-collapse: collapse;
            width: 100%;
          }
          
          #report-content tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          /* Ensure borders are visible */
          #report-content th,
          #report-content td {
            border: 1px solid #e5e7eb !important;
          }
          
          /* Hide loading indicators */
          #report-content .text-sm.text-gray-500 {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
