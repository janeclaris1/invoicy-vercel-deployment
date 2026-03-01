import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, AlertTriangle, ArrowRight } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const InventoryPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [levels, setLevels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const params = warehouseFilter ? `?warehouseId=${warehouseFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.LOW_STOCK_ALERTS + params);
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAlerts([]);
    }
  };

  const fetchLevels = async () => {
    try {
      const params = warehouseFilter ? `?warehouseId=${warehouseFilter}` : "";
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.STOCK_LEVELS + params);
      setLevels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock levels");
      setLevels([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.WAREHOUSES);
      setWarehouses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setWarehouses([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchLevels(), fetchWarehouses()]);
      setLoading(false);
    };
    load();
  }, [warehouseFilter]);

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory overview</h2>
        <div className="flex items-center gap-2">
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All locations</option>
            {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
          <Link to="/stock" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            Stock management <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" /> Low stock ({alerts.length})
          </h3>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {alerts.slice(0, 10).map((a) => (
              <li key={a._id}>
                {a.name}{a.sku ? ` (${a.sku})` : ""} — {a.quantityInStock ?? 0} {a.unit || "units"} (reorder at {a.reorderLevel ?? 0})
                {a.warehouse && ` — ${a.warehouse.name}`}
              </li>
            ))}
            {alerts.length > 10 && <li>... and {alerts.length - 10} more</li>}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Stock levels by location</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Per-warehouse levels. Global item stock is in Stock Management.
        </p>
        {levels.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-8 text-center text-gray-500">
            No stock levels recorded for this warehouse. Add warehouses and use Purchase Orders to receive stock, or adjust in Stock Management.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Warehouse</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Reorder level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {levels.map((l) => (
                  <tr key={l._id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.item?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{l.warehouse?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">{l.quantity}</td>
                    <td className="px-4 py-3 text-right">{l.reorderLevel ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
