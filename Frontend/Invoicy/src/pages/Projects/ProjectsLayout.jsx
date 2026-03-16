import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FolderKanban, Clock, GitBranch, FileText, Calendar, FileEdit } from "lucide-react";

const tabs = [
  { to: "", label: "All Projects", icon: FolderKanban, end: true },
  { to: "time", label: "Time Entries", icon: Clock, end: false },
  { to: "timeline", label: "Timeline", icon: GitBranch, end: false },
  { to: "notes", label: "Notes", icon: FileText, end: false },
  { to: "calendar", label: "Calendar", icon: Calendar, end: false },
  { to: "project-documents", label: "Project Documents", icon: FileEdit, end: false },
  { to: "documents", label: "Documents & Forms", icon: FileText, end: false },
];

const ProjectsLayout = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 rounded-lg bg-slate-800 px-4 py-3">
        <h1 className="text-2xl font-bold text-white">Project Management</h1>
        <p className="text-slate-200 text-sm mt-1">
          Projects, tasks, milestones, and time tracking
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 rounded-b-lg bg-slate-800 border-b border-slate-700 mb-6 overflow-x-auto px-2 py-1">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to || "all"}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-400 text-white"
                  : "border-transparent text-slate-300 hover:text-white hover:border-slate-500"
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
