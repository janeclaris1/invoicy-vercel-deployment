import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatCurrency } from "../../utils/helper";
import { Users, Loader2, Trash2, DollarSign, PlusCircle, BarChart3, Printer, FileText, Image, FileSpreadsheet, Eye, ArrowUpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import toast from "react-hot-toast";

const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "KES", "ZAR"];
const STANDARD_PLANS = [
    { plan: "basic", interval: "monthly", label: "Basic (Monthly)", amount: 500, currency: "GHS" },
    { plan: "basic", interval: "annual", label: "Basic (Annual)", amount: 5300, currency: "GHS" },
    { plan: "pro", interval: "monthly", label: "Pro (Monthly)", amount: 700, currency: "GHS" },
    { plan: "pro", interval: "annual", label: "Pro (Annual)", amount: 7560, currency: "GHS" },
];
const DURATION_PRESETS = [
    { label: "1 month", months: 1 },
    { label: "3 months", months: 3 },
    { label: "6 months", months: 6 },
    { label: "1 year", months: 12 },
    { label: "2 years", months: 24 },
    { label: "3 years", months: 36 },
    { label: "5 years", months: 60 },
];

const Clients = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [customSubModalOpen, setCustomSubModalOpen] = useState(false);
    const [customSubClientId, setCustomSubClientId] = useState("");
    const [customAmount, setCustomAmount] = useState("");
    const [customCurrency, setCustomCurrency] = useState("GHS");
    const [customDurationMonths, setCustomDurationMonths] = useState(24);
    const [customSubmitting, setCustomSubmitting] = useState(false);
    const [customError, setCustomError] = useState(null);
    const [exporting, setExporting] = useState(null); // 'pdf' | 'excel' | 'jpeg' | null
    const [viewClient, setViewClient] = useState(null); // view subscription details
    const [subPlanType, setSubPlanType] = useState("custom"); // 'basic' | 'pro' | 'custom'
    const [subPlanInterval, setSubPlanInterval] = useState("monthly"); // for basic/pro

    const fetchClients = async () => {
        if (!user?.isPlatformAdmin) return;
        try {
            const res = await axiosInstance.get(API_PATHS.AUTH.CLIENTS);
            const data = res.data;
            setClients(Array.isArray(data.clients) ? data.clients : (data && !Array.isArray(data) ? [] : (res.data || [])));
            setTotalRevenue(typeof data?.totalRevenue === "number" ? data.totalRevenue : 0);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load clients");
            setClients([]);
            setTotalRevenue(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.isPlatformAdmin) {
            setLoading(false);
            return;
        }
        fetchClients();
    }, [user?.isPlatformAdmin]);

    const analytics = useMemo(() => {
        const total = clients.length;
        const withSub = clients.filter((c) => c.subscription).length;
        const active = clients.filter((c) => c.subscription?.status === "active").length;
        const byPlan = { basic: 0, pro: 0, enterprise: 0, custom: 0 };
        clients.forEach((c) => {
            const plan = (c.subscription?.plan || "").toLowerCase();
            if (plan in byPlan) byPlan[plan]++;
        });
        const planChartData = [
            { name: "Basic", value: byPlan.basic, color: "#3b82f6" },
            { name: "Pro", value: byPlan.pro, color: "#8b5cf6" },
            { name: "Enterprise", value: byPlan.enterprise, color: "#6366f1" },
            { name: "Custom", value: byPlan.custom, color: "#10b981" },
        ].filter((d) => d.value > 0);
        return { total, withSub, active, byPlan, planChartData };
    }, [clients]);

    const handleRemove = async (client) => {
        if (!window.confirm(`Remove "${client.name || client.email}"? This will delete their account and subscription.`)) return;
        setRemovingId(client._id);
        try {
            await axiosInstance.delete(API_PATHS.AUTH.CLIENTS_DELETE(client._id));
            await fetchClients();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove client");
        } finally {
            setRemovingId(null);
        }
    };

    const openCustomSubModal = (client) => {
        setViewClient(null);
        setCustomSubClientId(client ? client._id : "");
        const sub = client?.subscription;
        const plan = (sub?.plan || "custom").toLowerCase();
        const interval = (sub?.billingInterval || "monthly").toLowerCase();
        if (plan === "basic" || plan === "pro") {
            setSubPlanType(plan);
            setSubPlanInterval(interval === "annual" ? "annual" : "monthly");
            setCustomAmount("");
            setCustomCurrency(user?.currency || "GHS");
            setCustomDurationMonths(12);
        } else {
            setSubPlanType("custom");
            setSubPlanInterval("monthly");
            setCustomAmount(sub?.plan === "custom" ? String(sub.amount) : "");
            setCustomCurrency(sub?.currency || user?.currency || "GHS");
            let months = 24;
            if (sub?.currentPeriodEnd && sub.plan === "custom") {
                const end = new Date(sub.currentPeriodEnd);
                const now = new Date();
                months = Math.max(1, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
            }
            setCustomDurationMonths(months);
        }
        setCustomError(null);
        setCustomSubModalOpen(true);
    };

    const openViewModal = (client) => {
        setViewClient(client);
    };

    const handleCustomSubscriptionSubmit = async (e) => {
        e.preventDefault();
        setCustomError(null);
        const userId = customSubClientId.trim();
        if (!userId) {
            setCustomError("Please select a subscriber.");
            return;
        }
        const isStandard = subPlanType === "basic" || subPlanType === "pro";
        const payload = { userId };
        if (isStandard) {
            payload.plan = subPlanType;
            payload.billingInterval = subPlanInterval;
        } else {
            const amount = parseFloat(customAmount, 10);
            if (!Number.isFinite(amount) || amount < 0) {
                setCustomError("Please enter a valid amount.");
                return;
            }
            if (!Number.isInteger(customDurationMonths) || customDurationMonths < 1) {
                setCustomError("Duration must be at least 1 month.");
                return;
            }
            payload.amount = amount;
            payload.currency = customCurrency;
            payload.durationMonths = customDurationMonths;
        }
        setCustomSubmitting(true);
        try {
            await axiosInstance.post(API_PATHS.SUBSCRIPTIONS.CUSTOM, payload);
            setCustomSubModalOpen(false);
            fetchClients();
            toast.success("Subscription updated.");
        } catch (err) {
            setCustomError(err.response?.data?.message || "Failed to save subscription.");
        } finally {
            setCustomSubmitting(false);
        }
    };

    if (!user?.isPlatformAdmin) {
        return (
            <div className="p-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-6 text-center">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">Access restricted</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Only the platform admin can view subscribed clients.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = async () => {
        setExporting("pdf");
        try {
            const el = document.getElementById("clients-report-content");
            if (!el) {
                toast.error("Report content not found");
                return;
            }
            toast.loading("Generating PDF...", { id: "clients-pdf" });
            let html2pdfFn;
            try {
                const m = await import("html2pdf.js/dist/html2pdf.js");
                html2pdfFn = m.default || m.html2pdf || m;
            } catch (e1) {
                const m = await import("html2pdf.js");
                html2pdfFn = m.default || m.html2pdf || m;
            }
            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `Subscribed_Clients_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff",
                    onclone: (clonedDoc) => {
                        const clonedRoot = clonedDoc.getElementById("clients-report-content");
                        if (clonedRoot) copyResolvedStylesToClone(el, clonedRoot);
                    },
                },
                jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
                pagebreak: { mode: ["avoid-all", "css", "legacy"] },
            };
            await html2pdfFn().set(opt).from(el).save();
            toast.success("PDF downloaded", { id: "clients-pdf" });
        } catch (err) {
            toast.error(err?.message || "PDF export failed", { id: "clients-pdf" });
        } finally {
            setExporting(null);
        }
    };

    const handleExportExcel = () => {
        setExporting("excel");
        try {
            const headers = ["Name", "Email", "Business", "Plan", "Status", "Next Billing", "Revenue", "Joined"];
            const rows = clients.map((c) => {
                const sub = c.subscription;
                return [
                    c.name || "",
                    c.email || "",
                    c.businessName || "",
                    sub ? sub.plan : "",
                    sub ? sub.status : "",
                    sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "",
                    String(c.revenue ?? 0),
                    formatDate(c.createdAt),
                ];
            });
            const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Subscribed_Clients_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Excel (CSV) downloaded");
        } catch (err) {
            toast.error(err?.message || "Export failed");
        } finally {
            setExporting(null);
        }
    };

    const colorProps = ["color", "background-color", "border-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color"];

    const copyResolvedStylesToClone = (originalRoot, clonedRoot) => {
        if (!originalRoot || !clonedRoot) return;
        const origList = [originalRoot, ...originalRoot.querySelectorAll("*")];
        const cloneList = [clonedRoot, ...clonedRoot.querySelectorAll("*")];
        origList.forEach((origEl, i) => {
            const cloneEl = cloneList[i];
            if (!cloneEl || !cloneEl.style) return;
            try {
                const computed = window.getComputedStyle(origEl);
                colorProps.forEach((prop) => {
                    try {
                        const value = computed.getPropertyValue(prop);
                        if (value && value.trim() && value !== "inherit" && value !== "initial") {
                            cloneEl.style.setProperty(prop, value, "important");
                        }
                    } catch (_) {}
                });
            } catch (_) {}
        });
    };

    const handleExportJPEG = async () => {
        setExporting("jpeg");
        try {
            const el = document.getElementById("clients-report-content");
            if (!el) {
                toast.error("Report content not found");
                return;
            }
            toast.loading("Generating image...", { id: "clients-jpeg" });
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedRoot = clonedDoc.getElementById("clients-report-content");
                    if (clonedRoot) copyResolvedStylesToClone(el, clonedRoot);
                },
            });
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `Subscribed_Clients_${new Date().toISOString().slice(0, 10)}.jpg`;
            a.click();
            toast.success("Image downloaded", { id: "clients-jpeg" });
        } catch (err) {
            toast.error(err?.message || "Image export failed", { id: "clients-jpeg" });
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="p-6 overflow-x-hidden min-w-0">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        {t("nav.clients")}
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 mt-1">
                        All account owners (subscribed clients) on the platform.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => openCustomSubModal(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Custom subscription
                    </button>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-300">Total revenue</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(typeof totalRevenue === "number" ? totalRevenue : 0, user?.currency || "GHS")}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap print:hidden">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                            title="Print"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            disabled={!!exporting}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            title="Export as PDF"
                        >
                            {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={!!exporting}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            title="Export as Excel (CSV)"
                        >
                            {exporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            Excel
                        </button>
                        <button
                            type="button"
                            onClick={handleExportJPEG}
                            disabled={!!exporting}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            title="Export as JPEG"
                        >
                            {exporting === "jpeg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                            JPEG
                        </button>
                    </div>
                </div>
            </div>

            {/* Analytics */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                        <Users className="w-4 h-4" />
                        Total clients
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analytics.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                        <DollarSign className="w-4 h-4" />
                        Total revenue
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(totalRevenue, user?.currency || "GHS")}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                        <BarChart3 className="w-4 h-4" />
                        Active subscriptions
                    </div>
                    <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{analytics.active}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                        <BarChart3 className="w-4 h-4" />
                        With subscription
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analytics.withSub}</p>
                </div>
            </div>
            {analytics.planChartData.length > 0 && (
                <div className="mb-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm print:hidden">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Subscriptions by plan</h3>
                    <div className="h-64 min-h-[200px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={analytics.planChartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {analytics.planChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* View subscription modal */}
            {viewClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewClient(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscriber details</h2>
                        <dl className="space-y-2 text-sm">
                            <div><dt className="text-gray-500 dark:text-slate-400">Name</dt><dd className="font-medium text-gray-900 dark:text-white">{viewClient.name || "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Email</dt><dd className="text-gray-900 dark:text-white">{viewClient.email || "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Business</dt><dd className="text-gray-900 dark:text-white">{viewClient.businessName || "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Plan</dt><dd className="text-gray-900 dark:text-white">{viewClient.subscription ? viewClient.subscription.plan.charAt(0).toUpperCase() + viewClient.subscription.plan.slice(1) : "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Status</dt><dd className="text-gray-900 dark:text-white">{viewClient.subscription?.status || "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Amount</dt><dd className="text-gray-900 dark:text-white">{viewClient.subscription ? formatCurrency(viewClient.subscription.amount, viewClient.subscription.currency || "GHS") : "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Next billing</dt><dd className="text-gray-900 dark:text-white">{viewClient.subscription?.currentPeriodEnd ? formatDate(viewClient.subscription.currentPeriodEnd) : "—"}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Revenue</dt><dd className="text-gray-900 dark:text-white">{formatCurrency(viewClient.revenue ?? 0, user?.currency || "GHS")}</dd></div>
                            <div><dt className="text-gray-500 dark:text-slate-400">Joined</dt><dd className="text-gray-900 dark:text-white">{formatDate(viewClient.createdAt)}</dd></div>
                        </dl>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setViewClient(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300">Close</button>
                            <button type="button" onClick={() => { openCustomSubModal(viewClient); setViewClient(null); }} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">Upgrade / Edit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Upgrade subscription modal */}
            {customSubModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !customSubmitting && setCustomSubModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">View, create or upgrade subscription</h2>
                        <form onSubmit={handleCustomSubscriptionSubmit} className="space-y-4">
                            {customError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                                    {customError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Subscriber</label>
                                <select
                                    value={customSubClientId}
                                    onChange={(e) => setCustomSubClientId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name || c.email} {c.email ? `(${c.email})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Plan</label>
                                <select
                                    value={subPlanType}
                                    onChange={(e) => setSubPlanType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                    <option value="basic">Basic</option>
                                    <option value="pro">Pro</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            {(subPlanType === "basic" || subPlanType === "pro") && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Billing interval</label>
                                    <select
                                        value={subPlanInterval}
                                        onChange={(e) => setSubPlanInterval(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                        {STANDARD_PLANS.find((p) => p.plan === subPlanType && p.interval === subPlanInterval)
                                            ? formatCurrency(STANDARD_PLANS.find((p) => p.plan === subPlanType && p.interval === subPlanInterval).amount, "GHS")
                                            : ""}
                                    </p>
                                </div>
                            )}
                            {subPlanType === "custom" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            placeholder="e.g. 7000"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                            required={subPlanType === "custom"}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Currency</label>
                                        <select
                                            value={customCurrency}
                                            onChange={(e) => setCustomCurrency(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                        >
                                            {CURRENCIES.map((code) => (
                                                <option key={code} value={code}>{code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Duration</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {DURATION_PRESETS.map((p) => (
                                                <button
                                                    key={p.months}
                                                    type="button"
                                                    onClick={() => setCustomDurationMonths(p.months)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                        customDurationMonths === p.months ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={customDurationMonths}
                                            onChange={(e) => setCustomDurationMonths(parseInt(e.target.value, 10) || 1)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Months (e.g. 24 for 2 years)</p>
                                    </div>
                                </>
                            )}
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => !customSubmitting && setCustomSubModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" disabled={customSubmitting} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {customSubmitting ? "Saving…" : subPlanType === "custom" ? "Save subscription" : "Upgrade subscription"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 text-red-700 dark:text-red-300 print:hidden">
                    {error}
                </div>
            )}

            <div id="clients-report-content" className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm min-w-0 text-[11px] print:text-[10px]">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 print:block">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white print:text-sm">Subscribed Clients Report</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Generated on {formatDate(new Date().toISOString())}</p>
                </div>
                <div className="overflow-hidden min-w-0">
                    <table className="w-full table-fixed">
                        <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                            <tr>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[11%]">Name</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[13%]">Email</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[10%]">Business</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[9%]">Plan</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[9%]">Status</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[11%]">Next billing</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[9%]">Revenue</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[9%]">Joined</th>
                                <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider w-[9%] print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500 dark:text-slate-400 text-xs">
                                        No clients yet.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => {
                                    const sub = client.subscription;
                                    return (
                                        <tr key={client._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                            <td className="px-2 py-1.5 text-gray-900 dark:text-white font-medium truncate" title={client.name || "—"}>{client.name || "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-600 dark:text-slate-300 truncate" title={client.email || "—"}>{client.email || "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-600 dark:text-slate-300 truncate" title={client.businessName || "—"}>{client.businessName || "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-600 dark:text-slate-300 truncate">{sub ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "—"}</td>
                                            <td className="px-2 py-1.5">
                                                {sub ? (
                                                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                                        sub.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                                                        sub.status === "past_due" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                                                        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}>
                                                        {sub.status}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-2 py-1.5 text-gray-500 dark:text-slate-400 whitespace-nowrap">{sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}</td>
                                            <td className="px-2 py-1.5 text-gray-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(client.revenue ?? 0, user?.currency || "GHS")}</td>
                                            <td className="px-2 py-1.5 text-gray-500 dark:text-slate-400 whitespace-nowrap">{formatDate(client.createdAt)}</td>
                                            <td className="px-3 py-2.5 flex items-center gap-1.5 flex-wrap print:hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => openViewModal(client)}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openCustomSubModal(client)}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md"
                                                    title="Upgrade or edit subscription"
                                                >
                                                    <ArrowUpCircle className="w-4 h-4" />
                                                    Upgrade
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(client)}
                                                    disabled={removingId === client._id}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md disabled:opacity-50"
                                                    title="Remove client"
                                                >
                                                    {removingId === client._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Clients;
