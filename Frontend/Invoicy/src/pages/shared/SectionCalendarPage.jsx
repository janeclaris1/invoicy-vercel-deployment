import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Calendar } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";

const sectionLabel = { projects: "Project Management", production: "Production & Operations", supply_chain: "Supply Chain & Inventory" };

export default function SectionCalendarPage() {
  const location = useLocation();
  const section = location.pathname.startsWith("/projects") ? "projects" : location.pathname.startsWith("/production") ? "production" : "supply_chain";
  const [month, setMonth] = useState(moment());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (section === "projects") {
          const projRes = await axiosInstance.get(API_PATHS.PROJECTS.LIST);
          const projs = Array.isArray(projRes?.data) ? projRes.data : [];
          const fromProjs = projs.flatMap((p) => {
            const out = [];
            if (p.startDate) out.push({ date: moment(p.startDate).format("YYYY-MM-DD"), title: `${p.name} (Start)`, type: "project" });
            if (p.endDate) out.push({ date: moment(p.endDate).format("YYYY-MM-DD"), title: `${p.name} (End)`, type: "project" });
            return out;
          });
          const withMilestones = await Promise.all(projs.slice(0, 15).map(async (p) => {
            try {
              const r = await axiosInstance.get(API_PATHS.PROJECTS.MILESTONES(p._id));
              return (r.data || []).map((m) => ({ date: m.dueDate ? moment(m.dueDate).format("YYYY-MM-DD") : null, title: `${p.name}: ${m.name}`, type: "milestone" })).filter((e) => e.date);
            } catch { return []; }
          }));
          setEvents([...fromProjs, ...withMilestones.flat()]);
        } else if (section === "production") {
          const res = await axiosInstance.get(API_PATHS.PRODUCTION.WORK_ORDERS);
          const orders = Array.isArray(res?.data) ? res.data : [];
          setEvents(orders.filter((o) => o.dueDate).map((o) => ({ date: moment(o.dueDate).format("YYYY-MM-DD"), title: o.orderNumber || o.product || "Work order", type: "work_order" })));
        } else {
          const res = await axiosInstance.get(API_PATHS.SUPPLY_CHAIN.PURCHASE_ORDERS);
          const pos = Array.isArray(res?.data) ? res.data : [];
          setEvents(pos.filter((p) => p.expectedDate).map((p) => ({ date: moment(p.expectedDate).format("YYYY-MM-DD"), title: p.orderNumber || "PO", type: "po" })));
        }
      } catch (err) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [section]);

  const start = month.clone().startOf("month").startOf("week");
  const end = month.clone().endOf("month").endOf("week");
  const days = [];
  let d = start.clone();
  while (d.isSameOrBefore(end)) {
    days.push(d.clone());
    d.add(1, "day");
  }
  const eventsByDate = events.reduce((acc, e) => {
    if (!e.date) return acc;
    acc[e.date] = acc[e.date] || [];
    acc[e.date].push(e);
    return acc;
  }, {});

  if (loading) return <div className="py-8 text-gray-500">Loading calendar…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar – {sectionLabel[section]}
          </h2>
          <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMonth(month.clone().subtract(1, "month"))} className="px-3 py-1 border border-slate-500 rounded-lg bg-slate-700 text-white hover:bg-slate-600">Prev</button>
          <span className="font-medium min-w-[140px] text-center text-white">{month.format("MMMM YYYY")}</span>
          <button type="button" onClick={() => setMonth(month.clone().add(1, "month"))} className="px-3 py-1 border border-slate-500 rounded-lg bg-slate-700 text-white hover:bg-slate-600">Next</button>
        </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
          <div key={wd} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-600">{wd}</div>
        ))}
        {days.map((day) => {
          const key = day.format("YYYY-MM-DD");
          const isCurrentMonth = day.month() === month.month();
          const dayEvents = eventsByDate[key] || [];
          return (
            <div key={key} className={`min-h-[80px] p-2 bg-white ${!isCurrentMonth ? "opacity-50" : ""}`}>
              <span className="text-sm font-medium text-gray-700">{day.format("D")}</span>
              <ul className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e, i) => (
                  <li key={i} className="text-xs truncate bg-blue-50 text-blue-800 px-1 py-0.5 rounded" title={e.title}>{e.title}</li>
                ))}
                {dayEvents.length > 3 && <li className="text-xs text-gray-500">+{dayEvents.length - 3} more</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
