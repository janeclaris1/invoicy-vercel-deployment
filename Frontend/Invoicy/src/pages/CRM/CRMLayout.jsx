import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { User, Building2, Target, Briefcase, Calendar, BarChart3 } from "lucide-react";

const tabs = [
  { to: "contacts", label: "Contacts", icon: User },
  { to: "companies", label: "Companies", icon: Building2 },
  { to: "leads", label: "Leads", icon: Target },
  { to: "deals", label: "Deals", icon: Briefcase },
  { to: "meetings", label: "Meetings", icon: Calendar },
  { to: "reports", label: "Reports", icon: BarChart3 },
];

const CRMLayout = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
        <p className="text-gray-500 text-sm mt-1">Contacts, companies, leads, and deals</p>
      </div>
      <nav className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "contacts"}
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

export default CRMLayout;
