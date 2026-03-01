import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, User, Building2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";

const HrRecords = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", address: "", city: "", country: "",
    department: "", position: "", hireDate: "", status: "Active", emergencyContact: "", emergencyPhone: "",
    taxId: "", nationalId: "", complianceNotes: "", notes: "", branch: "",
  });
  const [branches, setBranches] = useState([]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.EMPLOYEES.GET_ALL);
      setEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.BRANCHES.GET_ALL);
        setBranches(Array.isArray(res.data) ? res.data : []);
      } catch {
        setBranches([]);
      }
    };
    load();
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => setFormData({
    firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", address: "", city: "", country: "",
    department: "", position: "", hireDate: "", status: "Active", emergencyContact: "", emergencyPhone: "",
    taxId: "", nationalId: "", complianceNotes: "", notes: "", branch: "",
  });

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      firstName: emp.firstName || "", lastName: emp.lastName || "", email: emp.email || "", phone: emp.phone || "",
      dateOfBirth: emp.dateOfBirth ? moment(emp.dateOfBirth).format("YYYY-MM-DD") : "", address: emp.address || "",
      city: emp.city || "", country: emp.country || "", department: emp.department || "", position: emp.position || "",
      hireDate: emp.hireDate ? moment(emp.hireDate).format("YYYY-MM-DD") : "", status: emp.status || "Active",
      emergencyContact: emp.emergencyContact || "", emergencyPhone: emp.emergencyPhone || "", taxId: emp.taxId || "",
      nationalId: emp.nationalId || "", complianceNotes: emp.complianceNotes || "", notes: emp.notes || "",
      branch: emp.branch?._id || emp.branch || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee record?")) return;
    try {
      await axiosInstance.delete(API_PATHS.EMPLOYEES.DELETE(id));
      setEmployees((prev) => prev.filter((e) => (e._id || e.id) !== id));
      toast.success("Employee record deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null,
        hireDate: formData.hireDate || null,
        branch: formData.branch || null,
      };
      if (editingEmployee) {
        const res = await axiosInstance.put(API_PATHS.EMPLOYEES.UPDATE(editingEmployee._id || editingEmployee.id), payload);
        setEmployees((prev) => prev.map((em) => ((em._id || em.id) === (editingEmployee._id || editingEmployee.id) ? res.data : em)));
        toast.success("Employee updated");
      } else {
        const res = await axiosInstance.post(API_PATHS.EMPLOYEES.CREATE, payload);
        setEmployees((prev) => [res.data, ...prev]);
        toast.success("Employee added");
      }
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save employee");
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeId || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Data & Records</h1>
          <p className="text-gray-600 dark:text-slate-400">Store and manage personnel files and employee records.</p>
        </div>
        <button onClick={() => { setEditingEmployee(null); resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shrink-0">
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by name, email, department, employee ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <div key={emp._id || emp.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"><User className="w-6 h-6 text-blue-900 dark:text-blue-300" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{emp.employeeId || "—"}</p>
                    {(emp.department || emp.position) && <p className="text-xs text-gray-500">{emp.department} · {emp.position || "—"}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(emp)} className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(emp._id || emp.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                {emp.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /><span>{emp.email}</span></div>}
                {emp.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" /><span>{emp.phone}</span></div>}
                {emp.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /><span>{emp.address}{emp.city ? `, ${emp.city}` : ""}</span></div>}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2 text-sm">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : emp.status === "On Leave" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200"}`}>{emp.status || "Active"}</span>
                {(emp.branch?.name || emp.branchName) && (
                  <span className="flex items-center gap-1 text-gray-500"><Building2 className="w-3.5 h-3.5" />{emp.branch?.name || emp.branchName}</span>
                )}
                {emp.hireDate && <span className="text-gray-500">Hired {moment(emp.hireDate).format("MMM YYYY")}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">
          {employees.length === 0 ? "No employees yet. Click Add Employee to create a record." : "No employees match your search."}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingEmployee ? "Edit Employee" : "Add Employee"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["firstName", "lastName", "email", "phone", "department", "position", "dateOfBirth", "hireDate", "address", "city", "country", "status", "emergencyContact", "emergencyPhone", "taxId", "nationalId"].map((name) => (
                  name === "status" ? (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                      <select name={name} value={formData[name]} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                        <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  ) : name === "dateOfBirth" || name === "hireDate" ? (
                    <div key={name}><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{name === "dateOfBirth" ? "Date of Birth" : "Hire Date"}</label><input type="date" name={name} value={formData[name]} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
                  ) : (
                    <div key={name}><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</label><input type={name === "email" ? "email" : "text"} name={name} value={formData[name]} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
                  )
                ))}
                {branches.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Branch</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                    <option value="">No branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}{b.isDefault ? " (Default)" : ""}</option>
                    ))}
                  </select>
                </div>
              )}
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Compliance Notes</label><textarea name="complianceNotes" value={formData.complianceNotes} onChange={handleInputChange} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingEmployee(null); resetForm(); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">{editingEmployee ? "Save Changes" : "Add Employee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrRecords;
