import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Package, ClipboardList, Users, Warehouse, TrendingUp } from "lucide-react";

const tabs = [
  { to: "inventory", label: "Inventory", icon: Package },
  { to: "procurement", label: "Procurement", icon: ClipboardList },
  { to: "suppliers", label: "Suppliers", icon: Users },
  { to: "warehouses", label: "Warehouses", icon: Warehouse },
  { to: "forecasting", label: "Forecasting", icon: TrendingUp },
];

export default function SupplyChainLayout() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Supply Chain & Inventory</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time inventory, procurement, suppliers, warehouses, and forecasting</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px border-blue-600 text-blue-600 dark:text-blue-400"
                : "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
