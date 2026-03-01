import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Share2, Calendar, FileText, BarChart3, Link2, Megaphone } from "lucide-react";

const tabs = [
  { to: "accounts", label: "Connected accounts", icon: Link2 },
  { to: "schedule", label: "Schedule", icon: Calendar },
  { to: "posts", label: "Posts", icon: FileText },
  { to: "ads", label: "Ads", icon: Megaphone },
  { to: "analytics", label: "Analytics", icon: BarChart3 },
];

const SocialLayout = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Share2 className="w-7 h-7 text-primary" />
          Social Media
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Connect accounts, schedule posts, and view analytics
        </p>
      </div>
      <nav className="flex gap-1 border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "accounts"}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600"
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

export default SocialLayout;
