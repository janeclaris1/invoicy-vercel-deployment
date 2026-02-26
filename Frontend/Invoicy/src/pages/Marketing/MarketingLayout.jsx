import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Megaphone, Layout, Zap, List, FileInput, BarChart3, Mail } from "lucide-react";

const tabs = [
  { to: "campaigns", label: "Campaigns", icon: Megaphone },
  { to: "landing-pages", label: "Landing Pages", icon: Layout },
  { to: "automation", label: "Automation", icon: Zap },
  { to: "lists", label: "Lists", icon: List },
  { to: "forms", label: "Forms", icon: FileInput },
  { to: "templates", label: "Email templates", icon: Mail },
  { to: "analytics", label: "Analytics", icon: BarChart3 },
];

const MarketingLayout = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-500 text-sm mt-1">Campaigns, landing pages, and automation</p>
      </div>
      <nav className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "campaigns"}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default MarketingLayout;
