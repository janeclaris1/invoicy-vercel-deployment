import React, { useEffect, useState } from "react";
import { User, Calendar, FileText, Edit2, Mail, Phone, MapPin, Plus, DollarSign, Printer } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency as formatCurrencyHelper } from "../../utils/helper";

const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Maternity", "Paternity", "Other"];

const HrSelfService = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || 'GHS';
  const [myEmployee, setMyEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [mySalary, setMySalary] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: "", address: "", city: "", country: "", emergencyContact: "", emergencyPhone: "" });
  const [leaveForm, setLeaveForm] = useState({ type: "Annual", startDate: moment().format("YYYY-MM-DD"), endDate: moment().format("YYYY-MM-DD"), days: "1", notes: "" });

  const fetchMyEmployee = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.EMPLOYEES.GET_ME);
      setMyEmployee(res.data);
      setProfileForm({ phone: res.data.phone || "", address: res.data.address || "", city: res.data.city || "", country: res.data.country || "", emergencyContact: res.data.emergencyContact || "", emergencyPhone: res.data.emergencyPhone || "" });
    } catch (err) {
      if (err.response?.status === 404) setMyEmployee(null);
      else toast.error(err.response?.data?.message || "Failed to load your record");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttendance = async () => {
    if (!myEmployee?._id) return;
    try {
      setLoadingAttendance(true);
      const res = await axiosInstance.get(`${API_PATHS.ATTENDANCE.GET_ALL}?employeeId=${myEmployee._id}`);
      setAttendance(Array.isArray(res.data) ? res.data.slice(0, 60) : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load attendance");
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchMyLeaveRequests = async () => {
    if (!myEmployee?._id) return;
    try {
      setLoadingLeave(true);
      const res = await axiosInstance.get(`${API_PATHS.LEAVE_REQUESTS.GET_ALL}?employeeId=${myEmployee._id}`);
      setLeaveRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setLoadingLeave(false);
    }
  };

  // Load payroll records and salary from API
  const fetchMyPayrollData = async () => {
    if (!myEmployee?._id) return;
    
    try {
      // Load payroll records
      const res = await axiosInstance.get(API_PATHS.PAYROLL.GET_ME);
      const records = Array.isArray(res.data) ? res.data : [];
      setPayrollRecords(records.sort((a, b) => {
        const dateA = new Date(a.payPeriod || a.createdAt);
        const dateB = new Date(b.payPeriod || b.createdAt);
        return dateB - dateA;
      }));
    } catch (err) {
      console.error("Failed to load payroll records:", err);
      setPayrollRecords([]);
    }
    
    try {
      // Load salary info
      const salaryRes = await axiosInstance.get(API_PATHS.SALARIES.GET_ME);
      setMySalary(salaryRes.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Failed to load salary:", err);
      }
      setMySalary(null);
    }
  };

  useEffect(() => { fetchMyEmployee(); }, []);
  useEffect(() => { 
    if (myEmployee) {
      fetchMyPayrollData();
      if (activeTab === "attendance") fetchMyAttendance();
      if (activeTab === "leave") fetchMyLeaveRequests();
      if (activeTab === "salary") fetchMyPayrollData();
    }
  }, [myEmployee, activeTab]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.put(API_PATHS.EMPLOYEES.UPDATE_ME, profileForm);
      setMyEmployee(res.data);
      setShowProfileEdit(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!myEmployee?._id) return;
    try {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const days = leaveForm.days ? Number(leaveForm.days) : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      await axiosInstance.post(API_PATHS.LEAVE_REQUESTS.CREATE, { employeeId: myEmployee._id, type: leaveForm.type, startDate: leaveForm.startDate, endDate: leaveForm.endDate, days, notes: leaveForm.notes || "" });
      toast.success("Leave request submitted");
      setShowLeaveModal(false);
      setLeaveForm({ type: "Annual", startDate: moment().format("YYYY-MM-DD"), endDate: moment().format("YYYY-MM-DD"), days: "1", notes: "" });
      fetchMyLeaveRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit leave request");
    }
  };

  // Print pay slip (similar to HrPayroll component)
  const handlePrintPaySlip = (payrollRecord) => {
    if (payrollRecord.status !== "Paid") {
      toast.error("Pay slip can only be printed for paid payroll records");
      return;
    }
    
    if (!myEmployee) {
      toast.error("Employee information not found");
      return;
    }
    
    const currency = payrollRecord.currency || mySalary?.currency || userCurrency;
    // Use formatCurrencyHelper to get proper currency symbol
    const currencySymbol = formatCurrencyHelper(0, currency).replace(/[\d.,\s]/g, '').trim();
    
    toast.loading("Preparing pay slip...", { id: "print-payslip" });

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const paySlipHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pay Slip - ${myEmployee.firstName} ${myEmployee.lastName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background: white;
              color: #000;
            }
            .payslip-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border: 2px solid #000;
              padding: 40px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header .company-logo {
              max-width: 150px;
              max-height: 80px;
              margin-bottom: 15px;
            }
            .header h1 {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #000;
            }
            .header .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #000;
            }
            .header p {
              font-size: 14px;
              color: #333;
            }
            .employer-section {
              background-color: #f9f9f9;
              padding: 15px;
              border: 1px solid #ddd;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            .employer-section h3 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #000;
              text-transform: uppercase;
            }
            .employer-section p {
              font-size: 12px;
              margin-bottom: 3px;
              color: #333;
            }
            .payslip-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #000;
              text-transform: uppercase;
            }
            .info-section p {
              font-size: 12px;
              margin-bottom: 5px;
              color: #333;
            }
            .earnings-deductions {
              margin-bottom: 30px;
            }
            .earnings-deductions h3 {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #000;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .earnings-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .earnings-table th,
            .earnings-table td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            .earnings-table th {
              background-color: #f5f5f5;
              font-weight: bold;
              color: #000;
            }
            .earnings-table td {
              color: #333;
            }
            .earnings-table .amount {
              text-align: right;
              font-weight: bold;
            }
            .total-section {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #000;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              font-size: 16px;
            }
            .total-row.net-pay {
              font-size: 20px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 15px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .signature-section {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              flex-wrap: wrap;
              gap: 20px;
            }
            .signature-box {
              text-align: center;
              flex: 1;
              min-width: 180px;
              max-width: 250px;
            }
            .signature-box img {
              max-width: 200px;
              max-height: 80px;
              margin-bottom: 10px;
            }
            .signature-box .signature-line {
              border-top: 1px solid #000;
              margin-top: 50px;
              padding-top: 5px;
              font-size: 12px;
              min-height: 60px;
            }
            .signature-box .signature-label {
              font-weight: bold;
              margin-top: 5px;
              font-size: 11px;
              color: #000;
            }
            @media print {
              body {
                padding: 0;
              }
              .payslip-container {
                border: none;
                padding: 20px;
              }
              @page {
                margin: 0.5in;
              }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header">
              ${user?.companyLogo ? `<img src="${user.companyLogo}" alt="Company Logo" class="company-logo" />` : ''}
              ${user?.businessName ? `<div class="company-name">${user.businessName}</div>` : ''}
              <h1>PAY SLIP</h1>
              <p>Pay Period: ${moment(payrollRecord.payPeriod).format("MMMM YYYY")}</p>
              <p>Payment Date: ${moment(payrollRecord.paymentDate).format("MMMM DD, YYYY")}</p>
            </div>
            
            <div class="employer-section">
              <h3>Employer Information</h3>
              ${user?.businessName ? `<p><strong>Company Name:</strong> ${user.businessName}</p>` : ''}
              ${user?.address ? `<p><strong>Address:</strong> ${user.address}</p>` : ''}
              ${user?.phone ? `<p><strong>Phone:</strong> ${user.phone}</p>` : ''}
              ${user?.email ? `<p><strong>Email:</strong> ${user.email}</p>` : ''}
              ${user?.tin ? `<p><strong>Tax ID (TIN):</strong> ${user.tin}</p>` : ''}
            </div>
            
            <div class="payslip-info">
              <div class="info-section">
                <h3>Employee Information</h3>
                <p><strong>Name:</strong> ${myEmployee.firstName} ${myEmployee.lastName}</p>
                <p><strong>Employee ID:</strong> ${myEmployee.employeeId || "N/A"}</p>
                <p><strong>Department:</strong> ${myEmployee.department || "N/A"}</p>
                <p><strong>Position:</strong> ${myEmployee.position || "N/A"}</p>
              </div>
              <div class="info-section">
                <h3>Payment Details</h3>
                <p><strong>Payment Method:</strong> ${payrollRecord.paymentMethod}</p>
                <p><strong>Status:</strong> ${payrollRecord.status}</p>
                ${payrollRecord.notes ? `<p><strong>Notes:</strong> ${payrollRecord.notes}</p>` : ''}
              </div>
            </div>
            
            <div class="earnings-deductions">
              <h3>Earnings & Deductions</h3>
              <table class="earnings-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Base Salary</td>
                    <td class="amount">${currencySymbol}${(parseFloat(payrollRecord.baseSalary) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  ${parseFloat(payrollRecord.bonuses) > 0 ? `
                  <tr>
                    <td>Bonuses</td>
                    <td class="amount">${currencySymbol}${(parseFloat(payrollRecord.bonuses) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  ` : ''}
                  ${parseFloat(payrollRecord.deductions) > 0 ? `
                  <tr>
                    <td>Deductions</td>
                    <td class="amount">-${currencySymbol}${(parseFloat(payrollRecord.deductions) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  ` : ''}
                  ${parseFloat(payrollRecord.tax) > 0 ? `
                  <tr>
                    <td>Tax</td>
                    <td class="amount">-${currencySymbol}${(parseFloat(payrollRecord.tax) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
            
            <div class="total-section">
              <div class="total-row net-pay">
                <span>Net Pay</span>
                <span>${currencySymbol}${(parseFloat(payrollRecord.netPay) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Employee Signature</div>
                <p style="font-size: 10px; color: #666; margin-top: 5px;">${myEmployee.firstName} ${myEmployee.lastName}</p>
              </div>
              
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Cashier Signature</div>
                <p style="font-size: 10px; color: #666; margin-top: 5px;">Authorized Personnel</p>
              </div>
              
              ${user?.companySignature ? `
              <div class="signature-box">
                <img src="${user.companySignature}" alt="Company Signature" />
                <div class="signature-label">Authorized Signature</div>
              </div>
              ` : ''}
              
              ${user?.companyStamp ? `
              <div class="signature-box">
                <img src="${user.companyStamp}" alt="Company Stamp" />
                <div class="signature-label">Company Stamp</div>
              </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p>This is a computer-generated pay slip. Signatures required for verification.</p>
              <p>Generated on ${moment().format("MMMM DD, YYYY [at] hh:mm A")}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(paySlipHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      toast.success("Pay slip ready for printing", { id: "print-payslip" });
    }, 250);
  };

  if (loading) return <div className="p-6 text-center py-12 text-gray-500">Loading...</div>;
  if (!myEmployee) return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Self-Service</h1>
      <p className="text-gray-600 dark:text-slate-400 mb-4">Update your personal information, view attendance, and request time off.</p>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 text-center max-w-lg mx-auto">
        <User className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <p className="text-gray-800 dark:text-slate-200 font-medium mb-2">No employee record linked</p>
        <p className="text-sm text-gray-600 dark:text-slate-400">Your account is not linked to an employee record. Contact HR to create and link your profile.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Self-Service</h1>
      <p className="text-gray-600 dark:text-slate-400 mb-6">Update your details, view attendance, and request time off.</p>
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-6">
        {["profile", "salary", "attendance", "leave"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-medium rounded-t-lg capitalize ${activeTab === tab ? "bg-blue-900 text-white" : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
            {tab === "profile" ? "My profile" : tab === "salary" ? "My salary" : tab === "attendance" ? "My attendance" : "My leave"}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"><User className="w-8 h-8 text-blue-900 dark:text-blue-300" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{myEmployee.firstName} {myEmployee.lastName}</h2>
                <p className="text-gray-600 dark:text-slate-400">{myEmployee.employeeId || "—"}</p>
                <p className="text-sm text-gray-500">{[myEmployee.department, myEmployee.position].filter(Boolean).join(" · ") || "—"}</p>
              </div>
            </div>
            <button onClick={() => setShowProfileEdit(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"><Edit2 className="w-4 h-4" /> Edit my details</button>
          </div>
          <div className="border-t border-gray-200 dark:border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {myEmployee.email && <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-400" /><div><p className="text-xs text-gray-500">Email</p><p className="text-gray-900 dark:text-white">{myEmployee.email}</p></div></div>}
            {myEmployee.phone && <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-gray-400" /><div><p className="text-xs text-gray-500">Phone</p><p className="text-gray-900 dark:text-white">{myEmployee.phone}</p></div></div>}
            {(myEmployee.address || myEmployee.city || myEmployee.country) && <div className="flex items-center gap-3 md:col-span-2"><MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" /><div><p className="text-xs text-gray-500">Address</p><p className="text-gray-900 dark:text-white">{[myEmployee.address, myEmployee.city, myEmployee.country].filter(Boolean).join(", ") || "—"}</p></div></div>}
            {(myEmployee.emergencyContact || myEmployee.emergencyPhone) && <><div className="flex items-center gap-3"><span className="text-xs text-gray-500">Emergency contact</span><p className="text-gray-900 dark:text-white">{myEmployee.emergencyContact || "—"}</p></div><div className="flex items-center gap-3"><span className="text-xs text-gray-500">Emergency phone</span><p className="text-gray-900 dark:text-white">{myEmployee.emergencyPhone || "—"}</p></div></>}
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {loadingAttendance ? <div className="p-8 text-center text-gray-500">Loading...</div> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 text-sm">
                    <tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Check-in</th><th className="px-4 py-3 font-medium">Check-out</th><th className="px-4 py-3 font-medium">Hours</th><th className="px-4 py-3 font-medium">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {attendance.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{r.date ? moment(r.date).format("MMM D, YYYY") : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.checkIn ? moment(r.checkIn).format("HH:mm") : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.checkOut ? moment(r.checkOut).format("HH:mm") : "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{r.hoursWorked ?? "—"}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "Present" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : r.status === "Absent" ? "bg-red-100 text-red-800" : r.status === "Leave" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200"}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loadingAttendance && attendance.length === 0 && <div className="p-8 text-center text-gray-500">No attendance records yet.</div>}
            </>
          )}
        </div>
      )}

      {activeTab === "salary" && (
        <div className="space-y-6">
          {/* Salary Information Card */}
          {mySalary && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                Salary Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Base Salary</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrencyHelper(mySalary.baseSalary || 0, mySalary.currency || userCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Pay Frequency</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{mySalary.payFrequency || "N/A"}</p>
                </div>
                {mySalary.startDate && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Start Date</p>
                    <p className="text-lg text-gray-900 dark:text-white">{moment(mySalary.startDate).format("MMMM DD, YYYY")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!mySalary && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 text-center">
              <DollarSign className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-800 dark:text-slate-200 font-medium mb-2">Salary information not available</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Your salary information has not been set up yet. Contact HR for details.</p>
            </div>
          )}

          {/* Payroll History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payroll History</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">View your payment history and download pay slips</p>
            </div>
            {payrollRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No payroll records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 text-sm">
                    <tr>
                      <th className="px-4 py-3 font-medium">Pay Period</th>
                      <th className="px-4 py-3 font-medium">Base Salary</th>
                      <th className="px-4 py-3 font-medium">Bonuses</th>
                      <th className="px-4 py-3 font-medium">Deductions</th>
                      <th className="px-4 py-3 font-medium">Tax</th>
                      <th className="px-4 py-3 font-medium">Net Pay</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {payrollRecords.map((record) => (
                      <tr key={record._id || record.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {moment(record.payPeriod).format("MMM YYYY")}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                          {formatCurrencyHelper(record.baseSalary || 0, record.currency || mySalary?.currency || userCurrency)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                          {formatCurrencyHelper(record.bonuses || 0, record.currency || mySalary?.currency || userCurrency)}
                        </td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400">
                          -{formatCurrencyHelper(record.deductions || 0, record.currency || mySalary?.currency || userCurrency).replace(/[₵$€£¥₹]/, '')}
                        </td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400">
                          -{formatCurrencyHelper(record.tax || 0, record.currency || mySalary?.currency || userCurrency).replace(/[₵$€£¥₹]/, '')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {formatCurrencyHelper(record.netPay || 0, record.currency || mySalary?.currency || userCurrency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" :
                            record.status === "Pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" :
                            record.status === "Processed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200" :
                            "bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200"
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {record.status === "Paid" && (
                            <button
                              type="button"
                              onClick={() => handlePrintPaySlip(record)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="Print Pay Slip"
                            >
                              <Printer className="w-4 h-4" />
                              <span className="text-sm">Print</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "leave" && (
        <>
          <div className="flex justify-end mb-4"><button onClick={() => setShowLeaveModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"><Plus className="w-5 h-5" /> Request time off</button></div>
          <div className="space-y-4">
            {loadingLeave ? <div className="text-center py-8 text-gray-500">Loading...</div> : leaveRequests.map((req) => (
              <div key={req._id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div><p className="font-medium text-gray-900 dark:text-white">{req.type} · {moment(req.startDate).format("MMM D")} – {moment(req.endDate).format("MMM D, YYYY")} ({req.days} day{req.days !== 1 ? "s" : ""})</p>{req.notes && <p className="text-sm text-gray-500">{req.notes}</p>}</div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${req.status === "Approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : req.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"}`}>{req.status}</span>
              </div>
            ))}
            {!loadingLeave && leaveRequests.length === 0 && <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">No leave requests. Use &quot;Request time off&quot; to submit one.</div>}
          </div>
        </>
      )}

      {showProfileEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit my details</h2>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {["phone", "address", "city", "country", "emergencyContact", "emergencyPhone"].map((name) => (
                <div key={name}><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</label><input type={name.includes("phone") ? "tel" : "text"} value={profileForm[name]} onChange={(e) => setProfileForm({ ...profileForm, [name]: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
              ))}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowProfileEdit(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Request time off</h2>
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Leave type</label><select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start date *</label><input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End date *</label><input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Days (optional)</label><input type="number" min="1" value={leaveForm.days} onChange={(e) => setLeaveForm({ ...leaveForm, days: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label><textarea value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Submit</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrSelfService;
