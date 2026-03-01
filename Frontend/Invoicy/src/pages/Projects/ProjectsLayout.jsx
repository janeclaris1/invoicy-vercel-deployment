import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FolderKanban, Clock } from "lucide-react";

const tabs = [
  { to: "", label: "All Projects", icon: FolderKanban, end: true },
  { to: "time", label: "Time Entries", icon: Clock, end: false },
];

const ProjectsLayout = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project Management</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Projects, tasks, milestones, and time tracking
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to || "all"}
            to={to}
            end={end}
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

export default ProjectsLayout;
