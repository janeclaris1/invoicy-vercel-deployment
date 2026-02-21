import React, { useEffect, useState } from "react";
import { Plus, Search, Calendar, Clock, User, FileText, Check, X } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";

const STATUS_OPTIONS = ["Present", "Absent", "Late", "Half-day", "Leave", "Off"];
const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Maternity", "Paternity", "Other"];

const HrAttendance = () => {
  const [activeTab, setActiveTab] = useState("attendance");
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(moment().format("YYYY-MM-DD"));
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("");
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ employeeId: "", date: moment().format("YYYY-MM-DD"), checkIn: "", checkOut: "", hoursWorked: "", status: "Present", notes: "" });
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", type: "Annual", startDate: "", endDate: "", days: "", notes: "" });

  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.EMPLOYEES.GET_ALL);
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
      setEmployees([]);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterEmployeeId) params.set("employeeId", filterEmployeeId);
      const res = await axiosInstance.get(`${API_PATHS.ATTENDANCE.GET_ALL}?${params}`);
      setAttendance(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load attendance");
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoadingLeave(true);
      const params = new URLSearchParams();
      if (leaveStatusFilter) params.set("status", leaveStatusFilter);
      if (filterEmployeeId) params.set("employeeId", filterEmployeeId);
      const res = await axiosInstance.get(`${API_PATHS.LEAVE_REQUESTS.GET_ALL}?${params}`);
      setLeaveRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setLoadingLeave(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { if (activeTab === "attendance") fetchAttendance(); }, [activeTab, filterDate, filterEmployeeId]);
  useEffect(() => { if (activeTab === "leave") fetchLeaveRequests(); }, [activeTab, leaveStatusFilter, filterEmployeeId]);

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(API_PATHS.ATTENDANCE.CREATE, {
        employeeId: attendanceForm.employeeId, date: attendanceForm.date,
        checkIn: attendanceForm.checkIn ? `${attendanceForm.date}T${attendanceForm.checkIn}:00` : null,
        checkOut: attendanceForm.checkOut ? `${attendanceForm.date}T${attendanceForm.checkOut}:00` : null,
        hoursWorked: attendanceForm.hoursWorked ? Number(attendanceForm.hoursWorked) : 0,
        status: attendanceForm.status, notes: attendanceForm.notes || "",
      });
      toast.success("Attendance saved");
      setShowAttendanceModal(false);
      setAttendanceForm({ employeeId: "", date: moment().format("YYYY-MM-DD"), checkIn: "", checkOut: "", hoursWorked: "", status: "Present", notes: "" });
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save attendance");
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const days = leaveForm.days ? Number(leaveForm.days) : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      await axiosInstance.post(API_PATHS.LEAVE_REQUESTS.CREATE, { employeeId: leaveForm.employeeId, type: leaveForm.type, startDate: leaveForm.startDate, endDate: leaveForm.endDate, days, notes: leaveForm.notes || "" });
      toast.success("Leave request submitted");
      setShowLeaveModal(false);
      setLeaveForm({ employeeId: "", type: "Annual", startDate: "", endDate: "", days: "", notes: "" });
      fetchLeaveRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit leave request");
    }
  };

  const handleLeaveStatus = async (id, status) => {
    try {
      await axiosInstance.put(API_PATHS.LEAVE_REQUESTS.UPDATE(id), { status });
      toast.success(`Leave request ${status.toLowerCase()}`);
      fetchLeaveRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      await axiosInstance.delete(API_PATHS.ATTENDANCE.DELETE(id));
      toast.success("Record deleted");
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const filteredAttendance = attendance.filter((r) => {
    if (!searchTerm) return true;
    const name = r.employee ? `${r.employee.firstName || ""} ${r.employee.lastName || ""}`.toLowerCase() : "";
    return name.includes(searchTerm.toLowerCase()) || (r.employee?.employeeId || "").toLowerCase().includes(searchTerm.toLowerCase());
  });
  const filteredLeave = leaveRequests.filter((r) => {
    if (!searchTerm) return true;
    const name = r.employee ? `${r.employee.firstName || ""} ${r.employee.lastName || ""}`.toLowerCase() : "";
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Time & Attendance</h1>
      <p className="text-gray-600 dark:text-slate-400 mb-6">Track working hours, shifts, and manage leave requests.</p>
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-6">
        <button onClick={() => setActiveTab("attendance")} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "attendance" ? "bg-blue-900 text-white" : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>Attendance</button>
        <button onClick={() => setActiveTab("leave")} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "leave" ? "bg-blue-900 text-white" : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>Leave Requests</button>
      </div>

      {activeTab === "attendance" && (
        <>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
            </div>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
            <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option value="">All employees</option>
              {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} {emp.employeeId ? `(${emp.employeeId})` : ""}</option>)}
            </select>
            <button onClick={() => { setAttendanceForm({ employeeId: filterEmployeeId || "", date: filterDate || moment().format("YYYY-MM-DD"), checkIn: "", checkOut: "", hoursWorked: "", status: "Present", notes: "" }); setShowAttendanceModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"><Plus className="w-5 h-5" /> Log attendance</button>
          </div>
          {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 text-sm">
                    <tr><th className="px-4 py-3 font-medium">Employee</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Check-in</th><th className="px-4 py-3 font-medium">Check-out</th><th className="px-4 py-3 font-medium">Hours</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium w-20">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredAttendance.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.employee?.firstName} {r.employee?.lastName} {r.employee?.employeeId && <span className="text-xs text-gray-500">({r.employee.employeeId})</span>}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.date ? moment(r.date).format("MMM D, YYYY") : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.checkIn ? moment(r.checkIn).format("HH:mm") : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.checkOut ? moment(r.checkOut).format("HH:mm") : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.hoursWorked ?? "—"}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "Present" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : r.status === "Absent" ? "bg-red-100 text-red-800" : r.status === "Leave" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200"}`}>{r.status}</span></td>
                        <td className="px-4 py-3"><button onClick={() => handleDeleteAttendance(r._id)} className="text-red-600 hover:text-red-700 text-sm">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && filteredAttendance.length === 0 && <div className="text-center py-12 text-gray-500">No attendance records. Use &quot;Log attendance&quot; to add.</div>}
            </div>
          )}
        </>
      )}

      {activeTab === "leave" && (
        <>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
            </div>
            <select value={leaveStatusFilter} onChange={(e) => setLeaveStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"><option value="">All statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select>
            <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"><option value="">All employees</option>{employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}</select>
            <button onClick={() => { setLeaveForm({ employeeId: filterEmployeeId || "", type: "Annual", startDate: moment().format("YYYY-MM-DD"), endDate: moment().format("YYYY-MM-DD"), days: "1", notes: "" }); setShowLeaveModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"><Plus className="w-5 h-5" /> New leave request</button>
          </div>
          {loadingLeave ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
            <div className="space-y-4">
              {filteredLeave.map((req) => (
                <div key={req._id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{req.employee?.firstName} {req.employee?.lastName} {req.employee?.employeeId && <span className="text-sm text-gray-500">({req.employee.employeeId})</span>}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{req.type} · {moment(req.startDate).format("MMM D")} – {moment(req.endDate).format("MMM D, YYYY")} ({req.days} day{req.days !== 1 ? "s" : ""})</p>
                    {req.notes && <p className="text-xs text-gray-500 mt-1">{req.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${req.status === "Approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : req.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"}`}>{req.status}</span>
                    {req.status === "Pending" && (
                      <>
                        <button onClick={() => handleLeaveStatus(req._id, "Approved")} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"><Check className="w-4 h-4" /> Approve</button>
                        <button onClick={() => handleLeaveStatus(req._id, "Rejected")} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><X className="w-4 h-4" /> Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!loadingLeave && filteredLeave.length === 0 && <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">No leave requests.</div>}
            </div>
          )}
        </>
      )}

      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Log attendance</h2>
            <form onSubmit={handleAttendanceSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee *</label><select value={attendanceForm.employeeId} onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"><option value="">Select employee</option>{employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} {emp.employeeId ? `(${emp.employeeId})` : ""}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date *</label><input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Check-in</label><input type="time" value={attendanceForm.checkIn} onChange={(e) => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Check-out</label><input type="time" value={attendanceForm.checkOut} onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hours</label><input type="number" step="0.5" min="0" value={attendanceForm.hoursWorked} onChange={(e) => setAttendanceForm({ ...attendanceForm, hoursWorked: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label><select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label><textarea value={attendanceForm.notes} onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAttendanceModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New leave request</h2>
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee *</label><select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"><option value="">Select employee</option>{employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} {emp.employeeId ? `(${emp.employeeId})` : ""}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Leave type</label><select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start date *</label><input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End date *</label><input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Days (optional)</label><input type="number" min="1" value={leaveForm.days} onChange={(e) => setLeaveForm({ ...leaveForm, days: e.target.value })} placeholder="Auto" className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label><textarea value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Submit</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrAttendance;
