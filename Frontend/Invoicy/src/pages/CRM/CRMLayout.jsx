import React from "react";
import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { User, Building2, Target, Briefcase, Calendar, BarChart3 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BASIC_PLAN_CRM_TABS } from "../../utils/data";

const allTabs = [
  { to: "contacts", label: "Contacts", icon: User },
  { to: "companies", label: "Companies", icon: Building2 },
  { to: "leads", label: "Leads", icon: Target },
  { to: "deals", label: "Deals", icon: Briefcase },
  { to: "meetings", label: "Meetings", icon: Calendar },
  { to: "reports", label: "Reports", icon: BarChart3 },
];

const CRMLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const plan = (user?.subscription?.plan || "basic").toLowerCase();
  const isTrialActive =
    (user?.subscription?.status || "").toLowerCase() === "trialing" &&
    user?.subscription?.currentPeriodEnd &&
    new Date(user.subscription.currentPeriodEnd).getTime() > Date.now();
  const isBasic = plan === "basic" && !isTrialActive;
  const tabs = isBasic ? allTabs.filter((t) => BASIC_PLAN_CRM_TABS.includes(t.to)) : allTabs;

  // Redirect Basic users (after trial) who land on a Pro-only CRM route (e.g. /crm/companies)
  const pathParts = location.pathname.split("/").filter(Boolean);
  const crmSegment = pathParts[1] || ""; // e.g. /crm/companies -> "companies", /crm/contacts/123 -> "contacts"
  if (isBasic && crmSegment && !BASIC_PLAN_CRM_TABS.includes(crmSegment)) {
    return <Navigate to="/crm/contacts" replace />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CRM</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {isBasic ? "Contacts only (upgrade to Pro for companies, leads, deals, meetings & reports)" : "Contacts, companies, leads, and deals"}
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "contacts"}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`
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
};

export default CRMLayout;
