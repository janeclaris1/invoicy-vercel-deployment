import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Plus, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";

const sectionLabel = { projects: "Project Management", production: "Production & Operations", supply_chain: "Supply Chain & Inventory" };

/** User-added tasks (Production or Supply Chain); shown on all section calendars. */
const GLOBAL_CAL_TASKS_KEY = "globalSectionCalendarTasks";

function loadGlobalTasks() {
  try {
    const raw = localStorage.getItem(GLOBAL_CAL_TASKS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((t) => t && t.date && t.title && String(t.date).match(/^\d{4}-\d{2}-\d{2}$/))
      : [];
  } catch {
    return [];
  }
}

export default function SectionCalendarPage() {
  const location = useLocation();
  const section = location.pathname.startsWith("/projects") ? "projects" : location.pathname.startsWith("/production") ? "production" : "supply_chain";
  const [month, setMonth] = useState(moment());
  const [events, setEvents] = useState([]);
  const [globalTasks, setGlobalTasks] = useState(loadGlobalTasks);
  const [loading, setLoading] = useState(true);
  const [newTaskDate, setNewTaskDate] = useState(() => moment().format("YYYY-MM-DD"));
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNote, setNewTaskNote] = useState("");

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === GLOBAL_CAL_TASKS_KEY) setGlobalTasks(loadGlobalTasks());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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

  const mergedEvents = useMemo(() => {
    const fromGlobal = globalTasks.map((t) => ({
      date: t.date,
      title: t.title,
      type: "custom_task",
      taskId: t.id,
      subtitle: t.note || "",
    }));
    return [...events, ...fromGlobal];
  }, [events, globalTasks]);

  const persistGlobalTasks = (next) => {
    setGlobalTasks(next);
    localStorage.setItem(GLOBAL_CAL_TASKS_KEY, JSON.stringify(next));
  };

  const handleAddGlobalTask = (e) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !newTaskDate) return;
    const row = {
      id: `cal-${Date.now()}`,
      date: newTaskDate,
      title,
      note: newTaskNote.trim() || "",
      createdAt: new Date().toISOString(),
    };
    persistGlobalTasks([...globalTasks, row]);
    setNewTaskTitle("");
    setNewTaskNote("");
    setNewTaskDate(moment().format("YYYY-MM-DD"));
  };

  const handleDeleteGlobalTask = (taskId) => {
    persistGlobalTasks(globalTasks.filter((t) => t.id !== taskId));
  };

  const start = month.clone().startOf("month").startOf("week");
  const end = month.clone().endOf("month").endOf("week");
  const days = [];
  let d = start.clone();
  while (d.isSameOrBefore(end)) {
    days.push(d.clone());
    d.add(1, "day");
  }
  const eventsByDate = mergedEvents.reduce((acc, e) => {
    if (!e.date) return acc;
    acc[e.date] = acc[e.date] || [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const showAddTaskForm = section === "production" || section === "supply_chain";

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
      {showAddTaskForm && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4" />
            Add task to all calendars
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Tasks you add here appear on the calendars in Production &amp; Operations, Supply Chain &amp; Inventory, and Project Management.
          </p>
          <form onSubmit={handleAddGlobalTask} className="flex flex-col md:flex-row md:flex-wrap gap-3 md:items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Delivery window, stock count, supplier call"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Note (optional)</label>
              <input
                type="text"
                value={newTaskNote}
                onChange={(e) => setNewTaskNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 md:mb-0"
            >
              Add task
            </button>
          </form>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300 mr-1 align-middle" /> Green entries are shared tasks. Other chips are from work orders, purchase orders, or projects.
      </p>
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
                {dayEvents.slice(0, 3).map((e, i) => {
                  const isCustom = e.type === "custom_task";
                  const chipClass = isCustom
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between gap-1"
                    : "bg-blue-50 text-blue-800";
                  return (
                    <li
                      key={isCustom && e.taskId ? e.taskId : `${e.title}-${i}`}
                      className={`text-xs truncate px-1 py-0.5 rounded ${chipClass}`}
                      title={e.subtitle ? `${e.title} — ${e.subtitle}` : e.title}
                    >
                      <span className="truncate">{e.title}</span>
                      {isCustom && e.taskId ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleDeleteGlobalTask(e.taskId);
                          }}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-emerald-200 text-emerald-800"
                          aria-label="Remove task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
                {dayEvents.length > 3 && <li className="text-xs text-gray-500">+{dayEvents.length - 3} more</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
