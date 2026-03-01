import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Cog, FileStack, Wrench, ClipboardList } from "lucide-react";

const tabs = [
  { to: "work-orders", label: "Work Orders", icon: ClipboardList },
  { to: "bom", label: "Bill of Materials", icon: FileStack },
  { to: "resources", label: "Resources", icon: Wrench },
  { to: "maintenance", label: "Maintenance", icon: Cog },
];

export default function ProductionLayout() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Production & Operations</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Work orders, BOM, resource planning, and maintenance</p>
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
