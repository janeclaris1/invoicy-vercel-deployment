import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Calendar } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";

const sectionLabel = { projects: "Project Management", production: "Production & Operations", supply_chain: "Supply Chain & Inventory" };

export default function SectionTimelinePage() {
  const location = useLocation();
  const section = location.pathname.startsWith("/projects") ? "projects" : location.pathname.startsWith("/production") ? "production" : "supply_chain";
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (section === "projects") {
          const projRes = await axiosInstance.get(API_PATHS.PROJECTS.LIST);
          const projs = Array.isArray(projRes?.data) ? projRes.data : [];
          const fromProjects = projs.map((p) => ({
            _id: p._id,
            title: p.name,
            date: p.startDate || p.createdAt,
            endDate: p.endDate,
            type: "project",
            status: p.status,
          }));
          const withMilestones = await Promise.all(
            projs.slice(0, 20).map(async (p) => {
              try {
                const r = await axiosInstance.get(API_PATHS.PROJECTS.MILESTONES(p._id));
                return (r.data || []).map((m) => ({ _id: m._id, title: m.name, date: m.dueDate || m.createdAt, type: "milestone", projectName: p.name }));
              } catch { return []; }
            })
          );
          const fromMilestones = withMilestones.flat();
          setEvents([...fromProjects, ...fromMilestones].filter((e) => e.date).sort((a, b) => new Date(a.date) - new Date(b.date)));
        } else if (section === "production") {
          const res = await axiosInstance.get(API_PATHS.PRODUCTION.WORK_ORDERS);
          const orders = Array.isArray(res?.data) ? res.data : [];
          setEvents(
            orders
              .map((o) => ({ _id: o._id, title: o.orderNumber || o.product || "Work order", date: o.dueDate || o.startDate || o.createdAt, type: "work_order", status: o.status }))
              .filter((e) => e.date)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
          );
        } else {
          const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDERS);
          const pos = Array.isArray(res?.data) ? res.data : [];
          setEvents(
            pos
              .map((p) => ({ _id: p._id, title: p.orderNumber || "Purchase order", date: p.expectedDate || p.orderDate || p.createdAt, type: "po", status: p.status }))
              .filter((e) => e.date)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
          );
        }
      } catch (err) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [section]);

  if (loading) return <div className="py-8 text-gray-500">Loading timeline…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Timeline – {sectionLabel[section]}
        </h2>
        <p className="text-sm text-slate-200 mt-1">Key dates from {section === "projects" ? "projects and milestones" : section === "production" ? "work orders" : "purchase orders"}.</p>
      </div>
      {events.length === 0 ? (
        <p className="text-gray-500 py-8">No dated items yet. Add projects, work orders, or purchase orders to see them here.</p>
      ) : (
        <ul className="border-l-2 border-blue-200 pl-6 space-y-4">
          {events.map((e) => (
            <li key={e._id} className="relative">
              <span className="absolute -left-[29px] w-3 h-3 rounded-full bg-blue-500" />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {moment(e.date).format("MMM D, YYYY")}
                {e.endDate && section === "projects" && e.type === "project" && ` – ${moment(e.endDate).format("MMM D, YYYY")}`}
              </div>
              <p className="font-medium text-gray-900">{e.title}</p>
              {e.projectName && <p className="text-xs text-gray-500">Project: {e.projectName}</p>}
              {e.status && <span className="text-xs text-gray-600">{e.status}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
