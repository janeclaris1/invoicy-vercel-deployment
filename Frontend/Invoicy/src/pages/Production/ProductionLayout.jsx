import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Cog, FileStack, Wrench, ClipboardList, GitBranch, FileText, Calendar, FileEdit } from "lucide-react";

const tabs = [
  { to: "work-orders", label: "Work Orders", icon: ClipboardList },
  { to: "bom", label: "Bill of Materials", icon: FileStack },
  { to: "resources", label: "Resources", icon: Wrench },
  { to: "maintenance", label: "Maintenance", icon: Cog },
  { to: "timeline", label: "Timeline", icon: GitBranch },
  { to: "notes", label: "Notes", icon: FileText },
  { to: "calendar", label: "Calendar", icon: Calendar },
  { to: "documents", label: "Documents & Forms", icon: FileEdit },
];

export default function ProductionLayout() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 rounded-lg bg-slate-800 px-4 py-3">
        <h1 className="text-2xl font-bold text-white">Production & Operations</h1>
        <p className="text-slate-200 text-sm mt-1">Work orders, BOM, resource planning, and maintenance</p>
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
