import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import { playNotificationSound } from "../../utils/notificationSound";
import { Minus, Plus, Search, Trash2, FilePlus } from "lucide-react";
import toast from "react-hot-toast";

function normalizePrice(raw) {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (raw == null) return 0;
    const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

const PosDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userCurrency = user?.currency || "GHS";
    const scanRef = useRef(null);

    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);
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
            return [...prev, { itemId: id, name, unitPrice: unit, qty: 1, sku: item.sku || "" }];
        });
    }, []);

    const filteredCatalog = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return catalog.slice(0, 48);
        return catalog
            .filter(
                (i) =>
                    (i.name || "").toLowerCase().includes(q) ||
                    (i.skuNorm && i.skuNorm.includes(q)) ||
                    String(i.id).toLowerCase().includes(q)
            )
            .slice(0, 48);
    }, [catalog, search]);

    const cartTotal = useMemo(
        () => cart.reduce((s, l) => s + l.qty * l.unitPrice, 0),
        [cart]
    );

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

    const clearCart = () => setCart([]);

    const checkout = () => {
        if (!cart.length) {
            toast.error("Cart is empty");
            return;
        }
        const posCartLines = cart.map((l) => ({
            catalogId: l.itemId,
            itemDescription: l.name,
            quantity: l.qty,
            itemPrice: l.unitPrice,
        }));
        navigate("/invoices/new", { state: { posCartLines } });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Point of sale</h1>
                    <p className="text-sm text-gray-600">Scan a barcode (SKU) or tap a product. Each add plays a short beep.</p>
                </div>
                <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                    Open Invoice Suite
                </Link>
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
                    Barcode scanners usually type text and press Enter. Items match on <strong>SKU</strong> (or item id).
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[320px]">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Search items…"
                            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {loading ? (
                        <p className="text-sm text-gray-500">Loading items…</p>
                    ) : (
                        <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                            {filteredCatalog.map((item) => (
                                <li key={String(item.id)}>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-2 py-2.5 text-left text-sm hover:bg-gray-50 px-1 rounded-lg"
                                        onClick={() => addToCart(item, true)}
                                    >
                                        <span className="font-medium text-gray-900 truncate">{item.name}</span>
                                        <span className="shrink-0 text-gray-600">
                                            {formatCurrency(item.priceNum, userCurrency)}
                                            {item.sku ? (
                                                <span className="ml-2 text-xs text-gray-400">SKU {item.sku}</span>
                                            ) : null}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-xl border border-emerald-900/20 bg-emerald-50/40 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900">Cart</h2>
                        <button
                            type="button"
                            onClick={clearCart}
                            disabled={!cart.length}
                            className="text-xs font-medium text-red-700 disabled:opacity-40"
                        >
                            Clear all
                        </button>
                    </div>
                    {cart.length === 0 ? (
                        <p className="text-sm text-gray-600 py-8 text-center">No items yet.</p>
                    ) : (
                        <ul className="space-y-2 max-h-56 overflow-y-auto mb-4">
                            {cart.map((line) => (
                                <li
                                    key={String(line.itemId)}
                                    className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{line.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {formatCurrency(line.unitPrice, userCurrency)} × {line.qty}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            aria-label="Decrease quantity"
                                            className="p-1 rounded hover:bg-gray-100"
                                            onClick={() => updateQty(line.itemId, -1)}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Increase quantity"
                                            className="p-1 rounded hover:bg-gray-100"
                                            onClick={() => {
                                                playNotificationSound(1);
                                                updateQty(line.itemId, 1);
                                            }}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Remove line"
                                            className="p-1 rounded hover:bg-red-50 text-red-600"
                                            onClick={() => removeLine(line.itemId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex items-center justify-between border-t border-emerald-900/10 pt-3 mb-3">
                        <span className="text-sm font-medium text-gray-700">Subtotal</span>
                        <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(cartTotal, userCurrency)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={checkout}
                        disabled={!cart.length}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-700 text-white py-3 font-medium hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FilePlus className="h-5 w-5" />
                        Create invoice from cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PosDashboard;
