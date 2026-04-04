import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import { playNotificationSound } from "../../utils/notificationSound";
import {
    Minus,
    Plus,
    Search,
    Trash2,
    Banknote,
    Package,
    Truck,
    Eye,
    Pencil,
    Printer,
    Save,
    XCircle,
    Loader2,
    RefreshCw,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { printPosReceiptWindow } from "../../utils/posReceiptPrint";

/** Filter key for items with no category set */
const UNCATEGORIZED_KEY = "__uncategorized__";

function normCategory(s) {
    return String(s || "").trim().toLowerCase();
}

function itemMatchesCategoryFilter(item, categoryFilter) {
    if (!categoryFilter) return true;
    const label = String(item.category || "").trim();
    if (categoryFilter === UNCATEGORIZED_KEY) return !label;
    return normCategory(label) === normCategory(categoryFilter);
}

const PAYMENT_METHODS = [
    { id: "cash", label: "Cash" },
    { id: "card", label: "Card" },
    { id: "momo", label: "Mobile money" },
    { id: "bank", label: "Bank transfer" },
    { id: "other", label: "Other" },
    { id: "cod", label: "Cash on delivery" },
];

function paymentMethodIdFromInvoice(inv) {
    const n = String(inv?.notes || "");
    const m = n.match(/Payment:\s*(.+)/);
    if (m) {
        const label = m[1].trim();
        const found = PAYMENT_METHODS.find((p) => p.label === label);
        if (found) return found.id;
    }
    const unpaid = String(inv?.status || "").toLowerCase() === "unpaid";
    if (unpaid && (Number(inv?.amountPaid) || 0) <= 0) return "cod";
    return "cash";
}

function normalizePrice(raw) {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (raw == null) return 0;
    const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function parseDecimalInput(raw) {
    const s = String(raw ?? "").trim().replace(",", ".");
    if (s === "" || s === ".") return 0;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

function toFloat2(raw) {
    return Math.round(parseDecimalInput(raw) * 100) / 100;
}

/** Backend accepts Mongo ObjectId strings; omit invalid placeholders from cart edits. */
function itemIdForApi(itemId) {
    const s = String(itemId ?? "");
    if (/^[a-f\d]{24}$/i.test(s)) return s;
    return null;
}

/** Data URL, absolute URL, or site-relative path → usable img src */
function resolveItemImageSrc(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (/^(data:|blob:)/i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("//")) return s;
    const base = String(BASE_URL || "").replace(/\/?$/, "");
    if (s.startsWith("/")) return `${base}${s}`;
    return s;
}

function PosProductImage({ raw, iconClass = "h-8 w-8" }) {
    const [failed, setFailed] = useState(false);
    const src = useMemo(() => resolveItemImageSrc(raw), [raw]);
    useEffect(() => {
        setFailed(false);
    }, [raw]);
    if (!src || failed) {
        return (
            <div className="flex h-full w-full min-h-[2.5rem] items-center justify-center bg-gray-100 text-gray-400">
                <Package className={iconClass} aria-hidden />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
}

const PosDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userCurrency = user?.currency || "GHS";
    const scanRef = useRef(null);
    const vatScenario = user?.graVatScenario || "inclusive";

    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);
    const [discountPercent, setDiscountPercent] = useState("");
    const [discountAmount, setDiscountAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);
    const [posOrders, setPosOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingEditId, setLoadingEditId] = useState(null);
    const [allInvoicesModalOpen, setAllInvoicesModalOpen] = useState(false);
    const [allInvoicesList, setAllInvoicesList] = useState([]);
    const [loadingAllInvoices, setLoadingAllInvoices] = useState(false);
    const [allInvoicesDateSort, setAllInvoicesDateSort] = useState("newest");

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
            const list = Array.isArray(res.data) ? res.data : [];
            setCatalog(
                list.map((i) => ({
                    ...i,
                    id: i._id || i.id,
                    priceNum: normalizePrice(i.price),
                    skuNorm: String(i.sku || "")
                        .trim()
                        .toLowerCase(),
                }))
            );
        } catch {
            const saved = localStorage.getItem("items");
            const raw = saved ? JSON.parse(saved) : [];
            setCatalog(
                (Array.isArray(raw) ? raw : []).map((i) => ({
                    ...i,
                    id: i._id || i.id,
                    priceNum: normalizePrice(i.price),
                    skuNorm: String(i.sku || "")
                        .trim()
                        .toLowerCase(),
                }))
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const loadPosOrders = useCallback(async () => {
        setLoadingOrders(true);
        try {
            const res = await axiosInstance.get(`${API_PATHS.INVOICES.GET_ALL_INVOICES}?posSale=true`);
            const list = Array.isArray(res.data) ? res.data : [];
            setPosOrders(list);
        } catch {
            setPosOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    }, []);

    useEffect(() => {
        loadPosOrders();
    }, [loadPosOrders]);

    useEffect(() => {
        const onInvoicesUpdated = () => loadPosOrders();
        window.addEventListener("invoicesUpdated", onInvoicesUpdated);
        return () => window.removeEventListener("invoicesUpdated", onInvoicesUpdated);
    }, [loadPosOrders]);

    const loadAllInvoices = useCallback(async () => {
        setLoadingAllInvoices(true);
        try {
            const res = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL_INVOICES);
            setAllInvoicesList(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAllInvoicesList([]);
            toast.error("Could not load invoices.");
        } finally {
            setLoadingAllInvoices(false);
        }
    }, []);

    const openAllInvoicesModal = () => {
        setAllInvoicesModalOpen(true);
        loadAllInvoices();
    };

    const sortedAllInvoices = useMemo(() => {
        const arr = [...allInvoicesList];
        const getT = (inv) => {
            const d = inv.createdAt || inv.invoiceDate;
            const t = d ? new Date(d).getTime() : 0;
            return Number.isFinite(t) ? t : 0;
        };
        arr.sort((a, b) => {
            const ta = getT(a);
            const tb = getT(b);
            return allInvoicesDateSort === "newest" ? tb - ta : ta - tb;
        });
        return arr;
    }, [allInvoicesList, allInvoicesDateSort]);

    useEffect(() => {
        if (!allInvoicesModalOpen) return;
        const onKey = (e) => {
            if (e.key === "Escape") setAllInvoicesModalOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [allInvoicesModalOpen]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get(API_PATHS.CATEGORIES.GET_ALL);
                const data = Array.isArray(res.data) ? res.data : [];
                if (!cancelled) {
                    setCategories(data.map((c) => ({ ...c, id: c._id || c.id })));
                }
            } catch {
                try {
                    const saved = localStorage.getItem("categories");
                    const raw = saved ? JSON.parse(saved) : [];
                    if (!cancelled) {
                        setCategories(
                            (Array.isArray(raw) ? raw : []).map((c) => ({
                                ...c,
                                id: c._id || c.id,
                            }))
                        );
                    }
                } catch {
                    if (!cancelled) setCategories([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const t = setTimeout(() => scanRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }, []);

    const findByScanCode = useCallback(
        (code) => {
            const c = String(code || "")
                .trim()
                .toLowerCase();
            if (!c) return null;
            return (
                catalog.find((item) => item.skuNorm && item.skuNorm === c) ||
                catalog.find((item) => String(item.id) === c || String(item._id) === c) ||
                null
            );
        },
        [catalog]
    );

    const addToCart = useCallback((item, playSound = true) => {
        if (!item) {
            toast.error("Item not found");
            return;
        }
        const id = item.id || item._id;
        const name = item.name || "Item";
        const unit = normalizePrice(item.priceNum ?? item.price);
        if (playSound) playNotificationSound(1);
        setCart((prev) => {
            const idx = prev.findIndex((l) => String(l.itemId) === String(id));
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                return next;
            }
            return [
                ...prev,
                {
                    itemId: id,
                    name,
                    unitPrice: unit,
                    qty: 1,
                    sku: item.sku || "",
                    image: typeof item.image === "string" ? item.image : "",
                },
            ];
        });
    }, []);

    const categoryChips = useMemo(() => {
        const fromApi = [...categories]
            .filter((c) => String(c.name || "").trim())
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
        const known = new Set(fromApi.map((c) => normCategory(c.name)));
        const orphanSet = new Set();
        for (const i of catalog) {
            const n = String(i.category || "").trim();
            if (n && !known.has(normCategory(n))) orphanSet.add(n);
        }
        const orphans = Array.from(orphanSet).sort((a, b) => a.localeCompare(b));
        const showUncategorized = catalog.some((i) => !String(i.category || "").trim());
        return { fromApi, orphans, showUncategorized };
    }, [categories, catalog]);

    const categoryOptions = useMemo(() => {
        const opts = [{ value: "", label: "All categories" }];
        const { fromApi, orphans, showUncategorized } = categoryChips;
        for (const c of fromApi) {
            const name = String(c.name || "").trim();
            if (name) opts.push({ value: name, label: name });
        }
        for (const name of orphans) {
            opts.push({ value: name, label: name });
        }
        if (showUncategorized) {
            opts.push({ value: UNCATEGORIZED_KEY, label: "Uncategorized" });
        }
        return opts;
    }, [categoryChips]);

    const imageRawForCartLine = useCallback(
        (line) => {
            const fromLine = typeof line.image === "string" ? line.image : "";
            if (fromLine.trim()) return fromLine;
            const found = catalog.find((c) => String(c.id) === String(line.itemId));
            return typeof found?.image === "string" ? found.image : "";
        },
        [catalog]
    );

    const filteredCatalog = useMemo(() => {
        let list = catalog.filter((i) => itemMatchesCategoryFilter(i, categoryFilter));
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (i) =>
                    (i.name || "").toLowerCase().includes(q) ||
                    (i.skuNorm && i.skuNorm.includes(q)) ||
                    String(i.id).toLowerCase().includes(q) ||
                    normCategory(i.category).includes(q)
            );
        }
        return list.slice(0, 72);
    }, [catalog, search, categoryFilter]);

    const lineSubtotal = useMemo(
        () => cart.reduce((s, l) => s + l.qty * l.unitPrice, 0),
        [cart]
    );

    const { subtotal, grandTotal, totalDiscount } = useMemo(() => {
        const VAT_RATE = 0.15;
        const NHIL_RATE = 0.025;
        const GETFUND_RATE = 0.025;
        const ALL_TAX_RATE = VAT_RATE + NHIL_RATE + GETFUND_RATE;

        let baseSubtotal = 0;
        let totalTaxInclusive = 0;

        if (vatScenario === "exclusive") {
            cart.forEach((line) => {
                baseSubtotal += line.qty * line.unitPrice;
            });
            baseSubtotal = Number(baseSubtotal.toFixed(2));
        } else {
            cart.forEach((line) => {
                totalTaxInclusive += line.qty * line.unitPrice;
            });
            baseSubtotal = Number((totalTaxInclusive / (1 + ALL_TAX_RATE)).toFixed(2));
        }

        const discountAmountNum = parseDecimalInput(discountAmount);
        const discountPercentNum = parseDecimalInput(discountPercent);
        let discount = 0;
        if (discountAmountNum > 0) {
            discount = discountAmountNum;
        } else if (discountPercentNum > 0) {
            discount = (baseSubtotal * discountPercentNum) / 100;
        }

        const discountedSubtotal = baseSubtotal - discount;
        const vat = discountedSubtotal * VAT_RATE;
        const nhil = discountedSubtotal * NHIL_RATE;
        const getFund = discountedSubtotal * GETFUND_RATE;
        const totalTax = vat + nhil + getFund;
        const grand =
            vatScenario === "exclusive"
                ? discountedSubtotal + totalTax
                : totalTaxInclusive - discount;

        return {
            subtotal: Number(baseSubtotal.toFixed(2)),
            grandTotal: Number(grand.toFixed(2)),
            totalDiscount: Number(discount.toFixed(2)),
        };
    }, [cart, discountPercent, discountAmount, vatScenario]);

    const primaryActionTitle = useMemo(() => {
        if (editingInvoiceId) return "Save changes to order and print receipt";
        if (paymentMethod === "cod") return "Save cash on delivery order and print receipt";
        return "Receive payment and print receipt";
    }, [editingInvoiceId, paymentMethod]);

    const onScanKeyDown = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const code = e.currentTarget.value.trim();
        e.currentTarget.value = "";
        if (!code) return;
        const item = findByScanCode(code);
        if (item) addToCart(item, true);
        else toast.error(`No item matches "${code}" (check SKU)`);
    };

    const updateQty = (itemId, delta) => {
        setCart((prev) =>
            prev
                .map((l) =>
                    String(l.itemId) === String(itemId)
                        ? { ...l, qty: Math.max(0, l.qty + delta) }
                        : l
                )
                .filter((l) => l.qty > 0)
        );
    };

    const removeLine = (itemId) => {
        setCart((prev) => prev.filter((l) => String(l.itemId) !== String(itemId)));
    };

    const clearCart = () => {
        setCart([]);
        setDiscountPercent("");
        setDiscountAmount("");
        setEditingInvoiceId(null);
    };

    const beginEditOrder = async (orderId) => {
        setLoadingEditId(orderId);
        try {
            const res = await axiosInstance.get(API_PATHS.INVOICES.GET_INVOICE_BY_ID(orderId));
            const inv = res.data;
            const lines = (inv.item || []).map((row, idx) => {
                const rawId = row.itemId;
                const iid = rawId ? String(rawId) : `line-${idx}`;
                const inCat = rawId
                    ? catalog.find((c) => String(c.id) === String(rawId))
                    : null;
                return {
                    itemId: iid,
                    name: row.description || "Item",
                    unitPrice: Number(row.unitPrice) || 0,
                    qty: Number(row.quantity) || 0,
                    sku: inCat?.sku || "",
                    image: typeof inCat?.image === "string" ? inCat.image : "",
                };
            });
            setCart(lines);
            const dp = inv.discountPercent;
            const da = inv.discountAmount;
            setDiscountPercent(dp != null && dp !== "" ? String(dp) : "");
            setDiscountAmount(da != null && da !== "" ? String(da) : "");
            setPaymentMethod(paymentMethodIdFromInvoice(inv));
            setEditingInvoiceId(inv._id);
            toast.success("Order loaded — adjust cart and save");
        } catch (e) {
            toast.error(e.response?.data?.message || "Could not load order");
        } finally {
            setLoadingEditId(null);
        }
    };

    const printOrderQuick = (inv) => {
        const ok = printPosReceiptWindow(inv, userCurrency, user);
        if (!ok) toast.error("Pop-up blocked — allow pop-ups to print.");
    };

    const amountPaidValue = Math.max(0, grandTotal);

    const receivePayment = async () => {
        if (!cart.length) {
            toast.error("Cart is empty");
            return;
        }
        const methodLabel =
            PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || paymentMethod;
        const isCod = paymentMethod === "cod";
        const itemsForApi = cart.map((l) => ({
            description: l.name,
            quantity: l.qty,
            unitPrice: l.unitPrice,
            itemId: itemIdForApi(l.itemId),
        }));
        const today = new Date().toISOString().split("T")[0];
        const billFrom = {
            businessName: user?.businessName || "",
            email: user?.email || "",
            address: user?.address || "",
            phone: user?.phone || "",
            tin: user?.tin || "",
        };
        const billTo = {
            clientName: "Walk-in (POS)",
            email: "",
            address: "",
            phone: "",
            tin: "",
        };
        const status = isCod ? "Unpaid" : "Fully Paid";
        const paid = isCod ? 0 : amountPaidValue;
        const balance = isCod ? grandTotal : 0;

        const createPayload = {
            invoiceDate: today,
            dueDate: today,
            billFrom,
            billTo,
            items: itemsForApi,
            notes: `POS sale · Payment: ${methodLabel}`,
            paymentTerms: methodLabel,
            type: "invoice",
            status,
            amountPaid: paid,
            balanceDue: balance,
            discountPercent: toFloat2(discountPercent),
            discountAmount: toFloat2(discountAmount),
            companyLogo: user?.companyLogo || "",
            companySignature: user?.companySignature || "",
            companyStamp: user?.companyStamp || "",
            posSale: true,
        };

        const updatePayload = {
            billFrom,
            billTo,
            items: itemsForApi,
            notes: `POS sale · Payment: ${methodLabel}`,
            paymentTerms: methodLabel,
            status,
            amountPaid: paid,
            discountPercent: toFloat2(discountPercent),
            discountAmount: toFloat2(discountAmount),
        };

        const wasEditing = !!editingInvoiceId;

        setSubmitting(true);
        try {
            let invoice;
            if (editingInvoiceId) {
                const res = await axiosInstance.put(
                    API_PATHS.INVOICES.UPDATE_INVOICE(editingInvoiceId),
                    updatePayload
                );
                invoice = res.data;
            } else {
                const res = await axiosInstance.post(API_PATHS.INVOICES.GET_ALL_INVOICES, createPayload);
                invoice = res.data?.invoice;
            }
            if (!invoice?._id) {
                toast.error("Sale saved but invoice id missing. Check invoices list.");
                return;
            }
            window.dispatchEvent(new CustomEvent("invoicesUpdated"));
            clearCart();
            toast.success(wasEditing ? "Order updated" : isCod ? "Order saved (COD)" : "Payment recorded");
            const printed = printPosReceiptWindow(invoice, userCurrency, user);
            if (!printed) {
                toast.error("Pop-up blocked — allow pop-ups to print, or find this sale under Sales → POS.");
            }
        } catch (error) {
            const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.response?.data?.errors?.[0]?.msg ||
                "Could not complete sale. Try again.";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-xl bg-blue-950 px-4 py-4 sm:px-5 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Point of sale</h1>
                    <p className="text-sm text-blue-100/95 mt-1">
                        Scan a barcode (SKU) or tap a product. Take payment, then print the receipt.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
                    <button
                        type="button"
                        onClick={openAllInvoicesModal}
                        className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                    >
                        All orders & invoices
                    </button>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 text-center"
                    >
                        Open Invoice Suite
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <label className="block text-xs font-medium text-gray-500 mb-1">Scanner / SKU input</label>
                <input
                    ref={scanRef}
                    type="text"
                    autoComplete="off"
                    placeholder="Focus here and scan — Enter adds the line"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                    onKeyDown={onScanKeyDown}
                />
                <p className="mt-2 text-xs text-gray-500">
                    Barcode scanners usually type text and press Enter. Items match on <strong>SKU</strong> (or item
                    id).
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)]">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[320px]">
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-end mb-3">
                        <div className="relative sm:col-span-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <label htmlFor="pos-item-search" className="sr-only">
                                Search items
                            </label>
                            <input
                                id="pos-item-search"
                                type="search"
                                placeholder="Search items…"
                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="pos-category" className="block text-xs font-medium text-gray-500 mb-1">
                                Category
                            </label>
                            <select
                                id="pos-category"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm bg-white disabled:opacity-50"
                            >
                                {categoryOptions.map((opt, idx) => (
                                    <option
                                        key={opt.value === "" ? "__all__" : `${opt.value}-${idx}`}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {loading ? (
                        <p className="text-sm text-gray-500">Loading items…</p>
                    ) : filteredCatalog.length === 0 ? (
                        <p className="text-sm text-gray-500 py-8 text-center">
                            {catalog.length === 0
                                ? "No products yet."
                                : "No items match this category or search."}
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[min(70vh,28rem)] overflow-y-auto pr-0.5">
                            {filteredCatalog.map((item) => (
                                <button
                                    key={String(item.id)}
                                    type="button"
                                    onClick={() => addToCart(item, true)}
                                    className="group aspect-square rounded-xl border border-gray-200 bg-gray-50/80 p-2 flex flex-col items-stretch justify-between text-left shadow-sm hover:border-blue-900 hover:bg-white hover:shadow transition-colors"
                                >
                                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">
                                        {item.sku ? `SKU ${item.sku}` : "\u00a0"}
                                    </span>
                                    <div className="w-full min-h-[4.5rem] flex-1 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200/80">
                                        <PosProductImage raw={item.image} iconClass="h-7 w-7" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-900 line-clamp-3 leading-snug flex-1 min-h-0">
                                        {item.name || "Item"}
                                    </span>
                                    <span className="text-xs font-semibold text-blue-950 tabular-nums">
                                        {formatCurrency(item.priceNum, userCurrency)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-sm font-semibold text-gray-900">Cart</h2>
                            {editingInvoiceId ? (
                                <span className="text-[10px] font-medium uppercase tracking-wide text-amber-900 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
                                    Editing
                                </span>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={clearCart}
                            disabled={!cart.length && !editingInvoiceId}
                            title={editingInvoiceId ? "Cancel editing" : "Clear cart"}
                            aria-label={editingInvoiceId ? "Cancel editing" : "Clear cart"}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            {editingInvoiceId ? <XCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                    </div>
                    {cart.length === 0 ? (
                        <p className="text-xs text-gray-600 py-4 text-center">No items yet.</p>
                    ) : (
                        <ul className="space-y-1 max-h-44 overflow-y-auto">
                            {cart.map((line) => (
                                <li
                                    key={String(line.itemId)}
                                    className="flex items-center gap-2 rounded-md bg-white border border-gray-200 px-2 py-1.5 text-xs"
                                >
                                    <div
                                        className="h-10 w-10 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-50"
                                        title={line.name}
                                    >
                                        <PosProductImage raw={imageRawForCartLine(line)} iconClass="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate leading-tight">
                                            {line.name}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {formatCurrency(line.unitPrice, userCurrency)} × {line.qty}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            aria-label="Decrease quantity"
                                            className="p-0.5 rounded hover:bg-gray-100"
                                            onClick={() => updateQty(line.itemId, -1)}
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Increase quantity"
                                            className="p-0.5 rounded hover:bg-gray-100"
                                            onClick={() => {
                                                playNotificationSound(1);
                                                updateQty(line.itemId, 1);
                                            }}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Remove line"
                                            className="p-0.5 rounded hover:bg-red-50 text-red-600"
                                            onClick={() => removeLine(line.itemId)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="border-t border-gray-200 pt-2 space-y-1.5">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Discount</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            <label className="block">
                                <span className="sr-only">Discount percent</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="%"
                                    value={discountPercent}
                                    onChange={(e) => {
                                        setDiscountPercent(e.target.value);
                                        setDiscountAmount("");
                                    }}
                                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                                />
                            </label>
                            <label className="block">
                                <span className="sr-only">Discount amount</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder={userCurrency}
                                    value={discountAmount}
                                    onChange={(e) => {
                                        setDiscountAmount(e.target.value);
                                        setDiscountPercent("");
                                    }}
                                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                                />
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            Use percent <strong>or</strong> fixed amount (not both). Matches invoice tax settings.
                        </p>
                    </div>

                    <div className="space-y-1 text-xs border-t border-gray-200 pt-2">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal (net basis)</span>
                            <span className="tabular-nums">{formatCurrency(subtotal, userCurrency)}</span>
                        </div>
                        {totalDiscount > 0 ? (
                            <div className="flex justify-between text-gray-600">
                                <span>Discount</span>
                                <span className="tabular-nums">−{formatCurrency(totalDiscount, userCurrency)}</span>
                            </div>
                        ) : null}
                        <div className="flex justify-between text-gray-600">
                            <span>Lines (incl. tax)</span>
                            <span className="tabular-nums">{formatCurrency(lineSubtotal, userCurrency)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-gray-900 pt-1">
                            <span>Total due</span>
                            <span className="tabular-nums text-sm">{formatCurrency(grandTotal, userCurrency)}</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-2 space-y-1.5">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Payment method</p>
                        <div className="flex flex-wrap gap-1">
                            {PAYMENT_METHODS.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(m.id)}
                                    aria-pressed={paymentMethod === m.id}
                                    className={`rounded-md px-2 py-1.5 text-[11px] font-medium border transition-colors ${
                                        paymentMethod === m.id
                                            ? "bg-blue-950 text-white border-blue-950"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={receivePayment}
                        disabled={!cart.length || submitting}
                        title={primaryActionTitle}
                        aria-label={primaryActionTitle}
                        className="w-full flex items-center justify-center rounded-lg bg-blue-950 text-white min-h-[48px] px-3 py-3 hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation active:scale-[0.99]"
                    >
                        {submitting ? (
                            <Loader2 className="h-6 w-6 animate-spin shrink-0" aria-hidden />
                        ) : editingInvoiceId ? (
                            <Save className="h-6 w-6 shrink-0" aria-hidden />
                        ) : paymentMethod === "cod" ? (
                            <Truck className="h-6 w-6 shrink-0" aria-hidden />
                        ) : (
                            <Banknote className="h-6 w-6 shrink-0" aria-hidden />
                        )}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Saved POS orders</h2>
                    <button
                        type="button"
                        onClick={() => loadPosOrders()}
                        disabled={loadingOrders}
                        title="Refresh list"
                        aria-label="Refresh list"
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {loadingOrders ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-900" aria-hidden />
                        ) : (
                            <RefreshCw className="h-4 w-4 text-gray-600" aria-hidden />
                        )}
                    </button>
                </div>
                {loadingOrders && posOrders.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading orders…</p>
                ) : posOrders.length === 0 ? (
                    <p className="text-sm text-gray-500">No POS orders yet.</p>
                ) : (
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs min-w-[520px]">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                    <th className="py-2 pr-2 font-medium">Date</th>
                                    <th className="py-2 pr-2 font-medium">Invoice</th>
                                    <th className="py-2 pr-2 font-medium text-right">Total</th>
                                    <th className="py-2 pr-2 font-medium">Status</th>
                                    <th className="py-2 pl-2 font-medium text-right w-[1%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posOrders.map((ord) => {
                                    const id = ord._id;
                                    const when = ord.createdAt
                                        ? new Date(ord.createdAt).toLocaleString(undefined, {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                          })
                                        : "—";
                                    return (
                                        <tr key={String(id)} className="border-b border-gray-100 last:border-0">
                                            <td className="py-2 pr-2 text-gray-700 whitespace-nowrap">{when}</td>
                                            <td className="py-2 pr-2 font-mono text-gray-900">{ord.invoiceNumber || "—"}</td>
                                            <td className="py-2 pr-2 text-right tabular-nums">
                                                {formatCurrency(ord.grandTotal ?? 0, userCurrency)}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-700">{ord.status || "—"}</td>
                                            <td className="py-2 pl-2">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => beginEditOrder(id)}
                                                        disabled={loadingEditId === id}
                                                        title="Edit order"
                                                        aria-label="Edit order"
                                                        className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 text-blue-900 disabled:opacity-50"
                                                    >
                                                        {loadingEditId === id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                                        ) : (
                                                            <Pencil className="h-4 w-4" aria-hidden />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/invoices/${id}`)}
                                                        title="View invoice"
                                                        aria-label="View invoice"
                                                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800"
                                                    >
                                                        <Eye className="h-4 w-4" aria-hidden />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => printOrderQuick(ord)}
                                                        title="Print receipt"
                                                        aria-label="Print receipt"
                                                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800"
                                                    >
                                                        <Printer className="h-4 w-4" aria-hidden />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {allInvoicesModalOpen ? (
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pos-all-invoices-title"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        aria-label="Close dialog"
                        onClick={() => setAllInvoicesModalOpen(false)}
                    />
                    <div
                        className="relative flex max-h-[min(92vh,720px)] w-full max-w-4xl flex-col rounded-t-xl border border-gray-200 bg-white shadow-xl sm:rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
                            <div>
                                <h2 id="pos-all-invoices-title" className="text-lg font-semibold text-gray-900">
                                    All orders & invoices
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Team invoices and orders. Sort by date below.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="font-medium whitespace-nowrap">Sort by date</span>
                                    <select
                                        value={allInvoicesDateSort}
                                        onChange={(e) => setAllInvoicesDateSort(e.target.value)}
                                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
                                    >
                                        <option value="newest">Newest first</option>
                                        <option value="oldest">Oldest first</option>
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setAllInvoicesModalOpen(false)}
                                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                                    aria-label="Close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4">
                            {loadingAllInvoices ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                                    Loading…
                                </div>
                            ) : sortedAllInvoices.length === 0 ? (
                                <p className="py-12 text-center text-sm text-gray-500">No invoices yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[640px]">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-200">
                                                <th className="py-2 pr-2 font-medium">Date</th>
                                                <th className="py-2 pr-2 font-medium">Number</th>
                                                <th className="py-2 pr-2 font-medium">Type</th>
                                                <th className="py-2 pr-2 font-medium">Customer</th>
                                                <th className="py-2 pr-2 font-medium text-right">Total</th>
                                                <th className="py-2 pr-2 font-medium">Status</th>
                                                <th className="py-2 pl-2 font-medium text-right w-[1%]">View</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedAllInvoices.map((inv) => {
                                                const id = inv._id;
                                                const d = inv.createdAt || inv.invoiceDate;
                                                const when = d
                                                    ? new Date(d).toLocaleString(undefined, {
                                                          dateStyle: "short",
                                                          timeStyle: "short",
                                                      })
                                                    : "—";
                                                const typ = String(inv.type || "invoice");
                                                const pos = inv.posSale === true;
                                                return (
                                                    <tr key={String(id)} className="border-b border-gray-100 last:border-0">
                                                        <td className="py-2 pr-2 text-gray-700 whitespace-nowrap">
                                                            {when}
                                                        </td>
                                                        <td className="py-2 pr-2 font-mono text-gray-900">
                                                            {inv.invoiceNumber || "—"}
                                                        </td>
                                                        <td className="py-2 pr-2 capitalize text-gray-700">
                                                            {typ}
                                                            {pos ? (
                                                                <span className="ml-1 text-[10px] font-semibold text-blue-800">
                                                                    · POS
                                                                </span>
                                                            ) : null}
                                                        </td>
                                                        <td className="py-2 pr-2 text-gray-700 max-w-[10rem] truncate">
                                                            {inv.billTo?.clientName || "—"}
                                                        </td>
                                                        <td className="py-2 pr-2 text-right tabular-nums">
                                                            {formatCurrency(inv.grandTotal ?? 0, userCurrency)}
                                                        </td>
                                                        <td className="py-2 pr-2 text-gray-700">{inv.status || "—"}</td>
                                                        <td className="py-2 pl-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAllInvoicesModalOpen(false);
                                                                    navigate(`/invoices/${id}`);
                                                                }}
                                                                className="text-xs font-medium text-blue-900 hover:underline"
                                                            >
                                                                Open
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default PosDashboard;
