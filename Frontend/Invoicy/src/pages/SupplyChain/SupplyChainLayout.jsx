import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Package, ClipboardList, Users, Warehouse, TrendingUp, GitBranch, FileText, Calendar, FileEdit } from "lucide-react";

const tabs = [
  { to: "inventory", label: "Inventory", icon: Package },
  { to: "procurement", label: "Procurement", icon: ClipboardList },
  { to: "suppliers", label: "Suppliers", icon: Users },
  { to: "warehouses", label: "Warehouses", icon: Warehouse },
  { to: "forecasting", label: "Forecasting", icon: TrendingUp },
  { to: "timeline", label: "Timeline", icon: GitBranch },
  { to: "notes", label: "Notes", icon: FileText },
  { to: "calendar", label: "Calendar", icon: Calendar },
  { to: "documents", label: "Documents & Forms", icon: FileEdit },
];

export default function SupplyChainLayout() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 rounded-lg bg-slate-800 px-4 py-3">
        <h1 className="text-2xl font-bold text-white">Supply Chain & Inventory</h1>
        <p className="text-slate-200 text-sm mt-1">Real-time inventory, procurement, suppliers, warehouses, and forecasting</p>
      </div>
      <nav className="flex flex-wrap gap-1 rounded-b-lg bg-slate-800 border-b border-slate-700 mb-6 overflow-x-auto px-2 py-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px border-blue-400 text-white"
                : "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px border-transparent text-slate-300 hover:text-white"
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
