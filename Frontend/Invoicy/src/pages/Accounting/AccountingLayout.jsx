import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, FileEdit, DollarSign, Book, Scale, TrendingUp, Wallet, FileText, Percent, Target } from "lucide-react";

const tabs = [
  { to: "chart-of-accounts", label: "Chart of Accounts", icon: BookOpen },
  { to: "journal-entries", label: "Journal Entries", icon: FileEdit },
  { to: "expenditures", label: "Expenditures", icon: DollarSign },
  { to: "bills", label: "Bills (AP)", icon: FileText },
  { to: "budgets", label: "Budgets", icon: Target },
  { to: "general-ledger", label: "General Ledger", icon: Book },
  { to: "trial-balance", label: "Trial Balance", icon: Scale },
  { to: "profit-loss", label: "Profit & Loss", icon: TrendingUp },
  { to: "balance-sheet", label: "Balance Sheet", icon: Wallet },
  { to: "tax-and-currency", label: "Tax & Currency", icon: Percent },
];

const AccountingLayout = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Accounting</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Chart of accounts, journal entries, ledgers, and financial statements
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "chart-of-accounts"}
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

export default AccountingLayout;
