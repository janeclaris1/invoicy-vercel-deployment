import React, { useEffect, useState } from "react";
import { DollarSign, Plus, Edit, Trash2, Download, Calendar, Building2, CreditCard, FileText, Search, Filter, Check, X, Printer } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency as formatCurrencyHelper } from "../../utils/helper";

const BENEFIT_TYPES = ["Health Insurance", "Dental Insurance", "Vision Insurance", "Life Insurance", "Retirement Plan", "Paid Time Off", "Stock Options", "Other"];
const PAYMENT_METHODS = ["Bank Transfer", "Check", "Cash", "PayPal", "Other"];
const PAYROLL_STATUS = ["Draft", "Pending", "Processed", "Paid", "Cancelled"];

const HrPayroll = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || 'GHS';
  
  // Currency options matching Profile/Settings pages
  const currencyOptions = [
    { label: 'GHS - Ghana Cedis', value: 'GHS' },
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'GBP - British Pound', value: 'GBP' },
    { label: 'NGN - Nigerian Naira', value: 'NGN' },
    { label: 'KES - Kenyan Shilling', value: 'KES' },
    { label: 'ZAR - South African Rand', value: 'ZAR' },
    { label: 'XOF - West African CFA Franc', value: 'XOF' },
    { label: 'XAF - Central African CFA Franc', value: 'XAF' },
  ];
  
  const [activeTab, setActiveTab] = useState("payroll");
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(moment().format("YYYY-MM"));
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  
  // Modals
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [editingBenefit, setEditingBenefit] = useState(null);
  
  // Forms
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "",
    baseSalary: "",
    currency: userCurrency,
    payFrequency: "Monthly",
    startDate: moment().format("YYYY-MM-DD"),
    notes: ""
  });
  
  const [payrollForm, setPayrollForm] = useState({
    employeeId: "",
    payPeriod: moment().format("YYYY-MM"),
    baseSalary: "",
    bonuses: "",
    deductions: "",
    tax: "",
    netPay: "",
    currency: userCurrency,
    paymentMethod: "Bank Transfer",
    paymentDate: moment().format("YYYY-MM-DD"),
    status: "Draft",
    notes: ""
  });
  
  const [benefitForm, setBenefitForm] = useState({
    employeeId: "",
    type: "Health Insurance",
    provider: "",
    planName: "",
    coverageAmount: "",
    employeeContributionType: "percentage", // "percentage" or "amount"
    employerContributionType: "percentage", // "percentage" or "amount"
    employeeContributionPercent: "",
    employerContributionPercent: "",
    employeeContribution: "",
    employerContribution: "",
    currency: userCurrency,
    startDate: moment().format("YYYY-MM-DD"),
    endDate: "",
    status: "Active",
    notes: ""
  });

  // Load employees
  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.EMPLOYEES.GET_ALL);
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Update form currencies when userCurrency changes
  useEffect(() => {
    if (userCurrency && !salaryForm.currency) {
      setSalaryForm(prev => ({ ...prev, currency: userCurrency }));
    }
    if (userCurrency && !payrollForm.currency) {
      setPayrollForm(prev => ({ ...prev, currency: userCurrency }));
    }
  }, [userCurrency]);

  // Load salaries from API
  const fetchSalaries = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SALARIES.GET_ALL);
      setSalaries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load salaries:", err);
      setSalaries([]);
    }
  };

  // Load payroll records from API
  const fetchPayrollRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.set("payPeriod", filterMonth);
      if (filterStatus) params.set("status", filterStatus);
      
      const res = await axiosInstance.get(`${API_PATHS.PAYROLL.GET_ALL}?${params}`);
      setPayrollRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payroll records");
      setPayrollRecords([]);
    }
  };

  // Load benefits from localStorage (benefits can be migrated later if needed)
  const loadBenefits = () => {
    try {
      const stored = localStorage.getItem("employeeBenefits");
      if (stored) {
        setBenefits(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load benefits:", err);
    }
  };

  // Save benefits to localStorage
  const saveBenefits = (benefitsList) => {
    try {
      localStorage.setItem("employeeBenefits", JSON.stringify(benefitsList));
      setBenefits(benefitsList);
    } catch (err) {
      console.error("Failed to save benefits:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
    fetchPayrollRecords();
    loadBenefits();
  }, []);

  useEffect(() => {
    if (activeTab === "payroll") {
      fetchPayrollRecords();
    }
  }, [filterMonth, filterStatus, activeTab]);

  // Calculate net pay
  const calculateNetPay = (baseSalary, bonuses, deductions, tax) => {
    const base = parseFloat(baseSalary) || 0;
    const bonus = parseFloat(bonuses) || 0;
    const deduct = parseFloat(deductions) || 0;
    const taxAmount = parseFloat(tax) || 0;
    return (base + bonus - deduct - taxAmount).toFixed(2);
  };

  // Format currency - use helper function with user's currency as default
  const formatCurrency = (amount, currency = null) => {
    const currencyToUse = currency || userCurrency;
    return formatCurrencyHelper(amount, currencyToUse);
  };

  // Handle salary form submission
  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    try {
      const salaryData = {
        employeeId: salaryForm.employeeId,
        baseSalary: parseFloat(salaryForm.baseSalary),
        currency: salaryForm.currency,
        payFrequency: salaryForm.payFrequency,
        startDate: salaryForm.startDate,
        notes: salaryForm.notes || "",
      };
      
      await axiosInstance.post(API_PATHS.SALARIES.CREATE, salaryData);
      
      toast.success("Salary information saved");
      setShowSalaryModal(false);
        setSalaryForm({
          employeeId: "",
          baseSalary: "",
          currency: userCurrency,
          payFrequency: "Monthly",
          startDate: moment().format("YYYY-MM-DD"),
          notes: ""
        });
      setEditingEmployee(null);
      fetchSalaries(); // Refresh salaries
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save salary information");
    }
  };

  // Handle payroll form submission
  const handlePayrollSubmit = async (e) => {
    e.preventDefault();
    try {
      const netPay = calculateNetPay(
        payrollForm.baseSalary,
        payrollForm.bonuses,
        payrollForm.deductions,
        payrollForm.tax
      );
      
      // Get currency from employee's salary if not set, otherwise use user's organization currency
      let currency = payrollForm.currency || userCurrency;
      if (!payrollForm.currency && payrollForm.employeeId) {
        const employeeSalary = getEmployeeSalary(payrollForm.employeeId);
        if (employeeSalary) {
          currency = employeeSalary.currency || userCurrency;
        }
      }

      const payrollData = {
        employeeId: payrollForm.employeeId,
        payPeriod: payrollForm.payPeriod,
        baseSalary: parseFloat(payrollForm.baseSalary) || 0,
        bonuses: parseFloat(payrollForm.bonuses) || 0,
        deductions: parseFloat(payrollForm.deductions) || 0,
        tax: parseFloat(payrollForm.tax) || 0,
        netPay: parseFloat(netPay),
        currency: currency,
        paymentMethod: payrollForm.paymentMethod,
        paymentDate: payrollForm.paymentDate,
        status: payrollForm.status,
        notes: payrollForm.notes || "",
      };
      
      if (editingPayroll) {
        await axiosInstance.put(API_PATHS.PAYROLL.UPDATE(editingPayroll._id), payrollData);
        toast.success("Payroll record updated");
      } else {
        await axiosInstance.post(API_PATHS.PAYROLL.CREATE, payrollData);
        toast.success("Payroll record created");
      }
      
      setShowPayrollModal(false);
      setPayrollForm({
        employeeId: "",
        payPeriod: moment().format("YYYY-MM"),
        baseSalary: "",
        bonuses: "",
        deductions: "",
        tax: "",
        netPay: "",
        currency: userCurrency,
        paymentMethod: "Bank Transfer",
        paymentDate: moment().format("YYYY-MM-DD"),
        status: "Draft",
        notes: ""
      });
      setEditingPayroll(null);
      fetchPayrollRecords(); // Refresh payroll records
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save payroll record");
    }
  };

  // Handle benefit form submission
  const handleBenefitSubmit = async (e) => {
    e.preventDefault();
    try {
      // Get employee's salary to calculate contributions if using percentage
      const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
      const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
      
      let employeeContributionAmount = 0;
      let employerContributionAmount = 0;
      let employeePercent = 0;
      let employerPercent = 0;
      
      // Calculate contributions based on type (percentage or amount)
      if (benefitForm.employeeContributionType === "percentage") {
        employeePercent = parseFloat(benefitForm.employeeContributionPercent || 0);
        employeeContributionAmount = (baseSalary * employeePercent / 100) || 0;
      } else {
        employeeContributionAmount = parseFloat(benefitForm.employeeContribution || 0);
        // Calculate percentage if base salary exists
        employeePercent = baseSalary > 0 ? ((employeeContributionAmount / baseSalary) * 100) : 0;
      }
      
      if (benefitForm.employerContributionType === "percentage") {
        employerPercent = parseFloat(benefitForm.employerContributionPercent || 0);
        employerContributionAmount = (baseSalary * employerPercent / 100) || 0;
      } else {
        employerContributionAmount = parseFloat(benefitForm.employerContribution || 0);
        // Calculate percentage if base salary exists
        employerPercent = baseSalary > 0 ? ((employerContributionAmount / baseSalary) * 100) : 0;
      }
      
      const benefitData = {
        id: editingBenefit?.id || `benefit_${Date.now()}`,
        employeeId: benefitForm.employeeId,
        type: benefitForm.type,
        provider: benefitForm.provider || "",
        planName: benefitForm.planName || "",
        coverageAmount: parseFloat(benefitForm.coverageAmount) || 0,
        employeeContributionType: benefitForm.employeeContributionType,
        employerContributionType: benefitForm.employerContributionType,
        employeeContributionPercent: employeePercent,
        employerContributionPercent: employerPercent,
        employeeContribution: employeeContributionAmount,
        employerContribution: employerContributionAmount,
        currency: benefitForm.currency || userCurrency,
        startDate: benefitForm.startDate,
        endDate: benefitForm.endDate || "",
        status: benefitForm.status,
        notes: benefitForm.notes || "",
        createdAt: editingBenefit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      let updatedBenefits;
      if (editingBenefit) {
        updatedBenefits = benefits.map(b => 
          b.id === editingBenefit.id ? benefitData : b
        );
      } else {
        updatedBenefits = [...benefits, benefitData];
      }
      
      saveBenefits(updatedBenefits);
      toast.success("Benefit record saved");
      setShowBenefitModal(false);
      setBenefitForm({
        employeeId: "",
        type: "Health Insurance",
        provider: "",
        planName: "",
        coverageAmount: "",
        employeeContributionType: "percentage",
        employerContributionType: "percentage",
        employeeContributionPercent: "",
        employerContributionPercent: "",
        employeeContribution: "",
        employerContribution: "",
        currency: userCurrency,
        startDate: moment().format("YYYY-MM-DD"),
        endDate: "",
        status: "Active",
        notes: ""
      });
      setEditingBenefit(null);
    } catch (err) {
      toast.error("Failed to save benefit record");
    }
  };

  // Delete payroll record
  const handleDeletePayroll = async (id) => {
    if (!window.confirm("Delete this payroll record?")) return;
    try {
      await axiosInstance.delete(API_PATHS.PAYROLL.DELETE(id));
      toast.success("Payroll record deleted");
      fetchPayrollRecords(); // Refresh payroll records
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete payroll record");
    }
  };

  // Delete benefit
  const handleDeleteBenefit = (id) => {
    if (!window.confirm("Delete this benefit record?")) return;
    const updated = benefits.filter(b => b.id !== id);
    saveBenefits(updated);
    toast.success("Benefit record deleted");
  };

  // Print pay slip
  const handlePrintPaySlip = (payrollRecord) => {
    if (payrollRecord.status !== "Paid") {
      toast.error("Pay slip can only be printed for paid payroll records");
      return;
    }
    
    const employee = payrollRecord.employee || employees.find(e => e._id === (payrollRecord.employee?._id || payrollRecord.employee));
    if (!employee) {
      toast.error("Employee not found");
      return;
    }
    
    const currency = payrollRecord.currency || userCurrency;
    // Use formatCurrencyHelper to get proper currency symbol
    const currencySymbol = formatCurrencyHelper(0, currency).replace(/[\d.,\s]/g, '').trim();
    
    toast.loading("Preparing pay slip...", { id: "print-payslip" });

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const paySlipHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pay Slip - ${employee.firstName} ${employee.lastName}</title>
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
                <p><strong>Name:</strong> ${employee.firstName} ${employee.lastName}</p>
                <p><strong>Employee ID:</strong> ${employee.employeeId || "N/A"}</p>
                <p><strong>Department:</strong> ${employee.department || "N/A"}</p>
                <p><strong>Position:</strong> ${employee.position || "N/A"}</p>
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
                <p style="font-size: 10px; color: #666; margin-top: 5px;">${employee.firstName} ${employee.lastName}</p>
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
      // Optionally close the window after printing (uncomment if desired)
      // printWindow.close();
    }, 250);
  };

  // Get salary for employee
  const getEmployeeSalary = (employeeId) => {
    return salaries.find(s => {
      const empId = s.employee?._id || s.employee;
      return empId === employeeId || empId?.toString() === employeeId?.toString();
    });
  };

  // Open edit modals
  const openEditSalary = (employee) => {
    try {
      if (!employee || !employee._id) {
        toast.error("Invalid employee data");
        return;
      }
      setEditingEmployee(employee);
      
      const salary = getEmployeeSalary(employee._id);
      if (salary) {
        setSalaryForm({
          employeeId: employee._id,
          baseSalary: salary.baseSalary?.toString() || "",
          currency: salary.currency || userCurrency,
          payFrequency: salary.payFrequency || "Monthly",
          startDate: salary.startDate ? moment(salary.startDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
          notes: salary.notes || ""
        });
      } else {
        setSalaryForm({
          employeeId: employee._id,
          baseSalary: "",
          currency: userCurrency,
          payFrequency: "Monthly",
          startDate: moment().format("YYYY-MM-DD"),
          notes: ""
        });
      }
      setShowSalaryModal(true);
    } catch (error) {
      console.error("Error opening salary modal:", error);
      toast.error("Failed to open salary form");
    }
  };

  const openEditPayroll = (payroll) => {
    setEditingPayroll(payroll);
    const employeeId = payroll.employee?._id || payroll.employee || payroll.employeeId;
    
    // Get currency from payroll record or employee's salary, otherwise use user's organization currency
    let currency = payroll.currency || userCurrency;
    if (!payroll.currency && employeeId) {
      const employeeSalary = getEmployeeSalary(employeeId);
      if (employeeSalary) {
        currency = employeeSalary.currency || userCurrency;
      }
    }
    
    setPayrollForm({
      employeeId: employeeId,
      payPeriod: payroll.payPeriod,
      baseSalary: payroll.baseSalary?.toString() || "",
      bonuses: payroll.bonuses?.toString() || "",
      deductions: payroll.deductions?.toString() || "",
      tax: payroll.tax?.toString() || "",
      netPay: payroll.netPay?.toString() || "",
      currency: currency,
      paymentMethod: payroll.paymentMethod || "Bank Transfer",
      paymentDate: payroll.paymentDate ? moment(payroll.paymentDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      status: payroll.status || "Draft",
      notes: payroll.notes || ""
    });
    setShowPayrollModal(true);
  };

  const openEditBenefit = (benefit) => {
    setEditingBenefit(benefit);
    setBenefitForm({
      employeeId: benefit.employeeId,
      type: benefit.type,
      provider: benefit.provider || "",
      planName: benefit.planName || "",
      coverageAmount: benefit.coverageAmount?.toString() || "",
      employeeContributionType: benefit.employeeContributionType || "percentage",
      employerContributionType: benefit.employerContributionType || "percentage",
      employeeContributionPercent: benefit.employeeContributionPercent?.toString() || "",
      employerContributionPercent: benefit.employerContributionPercent?.toString() || "",
      employeeContribution: benefit.employeeContribution?.toString() || "",
      employerContribution: benefit.employerContribution?.toString() || "",
      currency: benefit.currency || userCurrency,
      startDate: benefit.startDate || moment().format("YYYY-MM-DD"),
      endDate: benefit.endDate || "",
      status: benefit.status || "Active",
      notes: benefit.notes || ""
    });
    setShowBenefitModal(true);
  };

  // Filter payroll records
  const filteredPayroll = payrollRecords.filter((r) => {
    const employee = r.employee || employees.find(e => e._id === (r.employee?._id || r.employee));
    
    // Search filter
    if (searchTerm) {
      const name = employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase() : "";
      if (!name.includes(searchTerm.toLowerCase())) return false;
    }
    
    // Month filter
    if (filterMonth && r.payPeriod) {
      if (moment(r.payPeriod).format("YYYY-MM") !== filterMonth) return false;
    }
    
    // Status filter
    if (filterStatus && r.status !== filterStatus) return false;
    
    // Department filter
    if (filterDepartment) {
      const dept = employee?.department || "N/A";
      if (dept !== filterDepartment) return false;
    }
    
    return true;
  });

  // Group payroll by department
  const payrollByDepartment = filteredPayroll.reduce((acc, record) => {
    const employee = record.employee || employees.find(e => e._id === (record.employee?._id || record.employee));
    const department = employee?.department || "Unassigned";
    
    if (!acc[department]) {
      acc[department] = [];
    }
    acc[department].push(record);
    return acc;
  }, {});

  // Get unique departments for filter dropdown
  const uniqueDepartments = Array.from(new Set(
    payrollRecords.map(r => {
      const employee = r.employee || employees.find(e => e._id === (r.employee?._id || r.employee));
      return employee?.department || "Unassigned";
    })
  )).sort();

  // Filter benefits
  const filteredBenefits = benefits.filter((b) => {
    if (searchTerm) {
      const employee = employees.find(e => e._id === b.employeeId || e._id?.toString() === b.employeeId?.toString());
      const name = employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase() : "";
      return name.includes(searchTerm.toLowerCase()) || b.type?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  // Get employee name - handles both payroll records and employee IDs
  const getEmployeeName = (payrollRecordOrId) => {
    let employee;
    
    // If it's a string (employee ID), find the employee directly
    if (typeof payrollRecordOrId === 'string') {
      employee = employees.find(e => e._id === payrollRecordOrId || e._id?.toString() === payrollRecordOrId?.toString());
    } 
    // If it's an object (payroll record), extract employee from it
    else if (payrollRecordOrId && typeof payrollRecordOrId === 'object') {
      employee = payrollRecordOrId.employee || employees.find(e => e._id === (payrollRecordOrId.employee?._id || payrollRecordOrId.employee));
    }
    
    return employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() : "Unknown";
  };

  // Calculate totals
  const totalPayroll = filteredPayroll.reduce((sum, r) => sum + (parseFloat(r.netPay) || 0), 0);
  const totalBenefits = filteredBenefits.reduce((sum, b) => sum + (parseFloat(b.employerContribution) || 0), 0);

  // Get currency for display (use first record's currency or default to user's organization currency)
  const displayCurrency = filteredPayroll.length > 0 && filteredPayroll[0].currency ? filteredPayroll[0].currency : userCurrency;

  return (
    <div className="p-6 overflow-x-hidden max-w-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payroll & Benefits</h1>
      <p className="text-gray-600 dark:text-slate-400 mb-6">Manage employee salaries, payroll processing, and benefits.</p>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-4 py-2 font-medium rounded-t-lg border ${
            activeTab === "payroll"
              ? "bg-blue-600 text-white border-blue-600"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-600"
          }`}
        >
          Payroll
        </button>
        <button
          onClick={() => setActiveTab("salaries")}
          className={`px-4 py-2 font-medium rounded-t-lg border ${
            activeTab === "salaries"
              ? "bg-blue-600 text-white border-blue-600"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-600"
          }`}
        >
          Salaries
        </button>
        <button
          onClick={() => setActiveTab("benefits")}
          className={`px-4 py-2 font-medium rounded-t-lg border ${
            activeTab === "benefits"
              ? "bg-blue-600 text-white border-blue-600"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-600"
          }`}
        >
          Benefits
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4 mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        {activeTab === "payroll" && (
          <>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              {PAYROLL_STATUS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Payroll Tab */}
      {activeTab === "payroll" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payroll Records</h2>
            <Button
              onClick={() => {
                setEditingPayroll(null);
                setPayrollForm({
                  employeeId: "",
                  payPeriod: moment().format("YYYY-MM"),
                  baseSalary: "",
                  bonuses: "",
                  deductions: "",
                  tax: "",
                  netPay: "",
                  paymentMethod: "Bank Transfer",
                  paymentDate: moment().format("YYYY-MM-DD"),
                  status: "Draft",
                  notes: ""
                });
                setShowPayrollModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 dark:border-blue-500 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Payroll
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Total Payroll</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPayroll, displayCurrency)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Records</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPayroll.length}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredPayroll.filter(r => r.status === "Pending").length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Payroll Tables Organized by Department */}
          {Object.keys(payrollByDepartment).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-8 text-center">
              <p className="text-gray-500 dark:text-slate-400">No payroll records found. Create one to get started.</p>
            </div>
          ) : (
            Object.entries(payrollByDepartment).map(([department, records]) => {
              const deptTotal = records.reduce((sum, r) => sum + (parseFloat(r.netPay) || 0), 0);
              const deptCurrency = records.length > 0 && records[0].currency ? records[0].currency : displayCurrency;
              
              return (
                <div key={department} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden mb-6">
                  {/* Department Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{department}</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{records.length} {records.length === 1 ? 'record' : 'records'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-slate-400">Department Total</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(deptTotal, deptCurrency)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Department Payroll Table */}
                  <div className="overflow-x-hidden">
                    <div className="min-w-0">
                      <table className="w-full table-auto">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Employee</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Pay Period</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Base Salary</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Bonuses</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Deductions</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Tax</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Net Pay</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Status</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                          {records.map((record) => (
                            <tr key={record._id || record.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                              <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white min-w-0 break-words">
                                {getEmployeeName(record)}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {record.payPeriod ? moment(record.payPeriod).format("MMM YYYY") : "N/A"}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {formatCurrency(record.baseSalary || 0, record.currency)}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {formatCurrency(record.bonuses || 0, record.currency)}
                              </td>
                              <td className="px-3 py-4 text-sm text-red-600 dark:text-red-400 min-w-0 break-words">
                                -{formatCurrency(record.deductions || 0, record.currency).replace(/[₵$€£]/, '')}
                              </td>
                              <td className="px-3 py-4 text-sm text-red-600 dark:text-red-400 min-w-0 break-words">
                                -{formatCurrency(record.tax || 0, record.currency).replace(/[₵$€£]/, '')}
                              </td>
                              <td className="px-3 py-4 text-sm font-semibold text-gray-900 dark:text-white min-w-0 break-words">
                                {formatCurrency(record.netPay || 0, record.currency)}
                              </td>
                              <td className="px-3 py-4 min-w-0">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.status === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" :
                                  record.status === "Pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" :
                                  record.status === "Processed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200" :
                                  "bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200"
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-sm font-medium min-w-0">
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => openEditPayroll(record)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    title="Edit Payroll"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  {record.status === "Paid" && (
                                    <button
                                      type="button"
                                      onClick={() => handlePrintPaySlip(record)}
                                      className="text-green-600 hover:text-green-900 dark:text-green-400 border border-green-600 dark:border-green-400 rounded px-2 py-1 hover:bg-green-50 dark:hover:bg-green-900/20"
                                      title="Print Pay Slip"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayroll(record._id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 border border-red-600 dark:border-red-400 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Delete Payroll"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Department Footer with Total */}
                        <tfoot className="bg-gray-50 dark:bg-slate-800">
                          <tr>
                            <td colSpan="6" className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              Department Total:
                            </td>
                            <td className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white min-w-0 break-words">
                              {formatCurrency(deptTotal, deptCurrency)}
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Salaries Tab */}
      {activeTab === "salaries" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Employee Salaries</h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-hidden">
              <div className="min-w-0">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Employee</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Department</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Position</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Base Salary</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Pay Frequency</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Start Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-3 py-8 text-center text-gray-500 dark:text-slate-400">
                          {loading ? "Loading employees..." : "No employees found."}
                        </td>
                      </tr>
                    ) : (
                      employees
                        .filter(emp => !searchTerm || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((employee) => {
                          const salary = getEmployeeSalary(employee._id);
                          return (
                            <tr key={employee._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                              <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white min-w-0 break-words">
                                {employee.firstName} {employee.lastName}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {employee.department || "N/A"}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {employee.position || "N/A"}
                              </td>
                              <td className="px-3 py-4 text-sm font-semibold text-gray-900 dark:text-white min-w-0 break-words">
                                {salary ? formatCurrency(salary.baseSalary || 0, salary.currency || userCurrency) : "Not set"}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {salary?.payFrequency || "N/A"}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                                {salary?.startDate ? moment(salary.startDate).format("MMM DD, YYYY") : "N/A"}
                              </td>
                              <td className="px-3 py-4 text-sm font-medium min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openEditSalary(employee)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center gap-1 border border-blue-600 dark:border-blue-400 rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <Edit className="w-4 h-4" />
                                  {salary ? "Edit" : "Set Salary"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Tab */}
      {activeTab === "benefits" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Employee Benefits</h2>
            <Button
              onClick={() => {
                setEditingBenefit(null);
                setBenefitForm({
                  employeeId: "",
                  type: "Health Insurance",
                  provider: "",
                  planName: "",
                  coverageAmount: "",
                  employeeContributionType: "percentage",
                  employerContributionType: "percentage",
                  employeeContributionPercent: "",
                  employerContributionPercent: "",
                  employeeContribution: "",
                  employerContribution: "",
                  currency: userCurrency,
                  startDate: moment().format("YYYY-MM-DD"),
                  endDate: "",
                  status: "Active",
                  notes: ""
                });
                setShowBenefitModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 dark:border-blue-500 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Benefit
            </Button>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Employer Contribution</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredBenefits.length > 0 && filteredBenefits[0].currency 
                    ? formatCurrency(totalBenefits, filteredBenefits[0].currency)
                    : formatCurrency(totalBenefits, userCurrency)}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Benefits Table */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-hidden">
              <div className="min-w-0">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Employee</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Provider</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Coverage</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Employee Contribution</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Employer Contribution</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider min-w-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredBenefits.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-3 py-8 text-center text-gray-500 dark:text-slate-400">
                          No benefits found. Add one to get started.
                        </td>
                      </tr>
                    ) : (
                      filteredBenefits.map((benefit) => (
                        <tr key={benefit.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                          <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white min-w-0 break-words">
                            {getEmployeeName(benefit.employeeId)}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                            {benefit.type}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                            {benefit.provider || "N/A"}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                            {formatCurrency(benefit.coverageAmount || 0, benefit.currency || userCurrency)}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600 dark:text-slate-400 min-w-0 break-words">
                            {formatCurrency(benefit.employeeContribution || 0, benefit.currency || userCurrency)}
                            {benefit.employeeContributionPercent && benefit.employeeContributionPercent > 0 
                              ? ` (${parseFloat(benefit.employeeContributionPercent).toFixed(2)}%)` 
                              : benefit.employeeContributionType === "amount" ? " (Fixed)" : ''}
                          </td>
                          <td className="px-3 py-4 text-sm font-semibold text-gray-900 dark:text-white min-w-0 break-words">
                            {formatCurrency(benefit.employerContribution || 0, benefit.currency || userCurrency)}
                            {benefit.employerContributionPercent && benefit.employerContributionPercent > 0 
                              ? ` (${parseFloat(benefit.employerContributionPercent).toFixed(2)}%)` 
                              : benefit.employerContributionType === "amount" ? " (Fixed)" : ''}
                          </td>
                          <td className="px-3 py-4 min-w-0">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              benefit.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {benefit.status}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm font-medium min-w-0">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => openEditBenefit(benefit)}
                                className="text-blue-600 hover:text-blue-900 border border-blue-600 dark:border-blue-400 rounded px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBenefit(benefit.id)}
                                className="text-red-600 hover:text-red-900 border border-red-600 dark:border-red-400 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSalaryModal(false);
            setEditingEmployee(null);
          }
        }}>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingEmployee ? "Edit Salary" : "Set Salary"}
              </h2>
            </div>
            <form onSubmit={handleSalarySubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee *</label>
                <select
                  value={salaryForm.employeeId}
                  onChange={(e) => setSalaryForm({ ...salaryForm, employeeId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Base Salary *</label>
                  <input
                    type="number"
                    value={salaryForm.baseSalary}
                    onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Currency</label>
                  <select
                    value={salaryForm.currency}
                    onChange={(e) => setSalaryForm({ ...salaryForm, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pay Frequency</label>
                  <select
                    value={salaryForm.payFrequency}
                    onChange={(e) => setSalaryForm({ ...salaryForm, payFrequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={salaryForm.startDate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  value={salaryForm.notes}
                  onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 dark:border-blue-600">
                  Save Salary
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowSalaryModal(false);
                    setEditingEmployee(null);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payroll Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowPayrollModal(false);
            setEditingPayroll(null);
          }
        }}>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingPayroll ? "Edit Payroll Record" : "Create Payroll Record"}
              </h2>
            </div>
            <form onSubmit={handlePayrollSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee *</label>
                  <select
                    value={payrollForm.employeeId}
                    onChange={(e) => {
                      const employeeId = e.target.value;
                      const emp = employees.find(emp => emp._id === employeeId);
                      const employeeSalary = getEmployeeSalary(employeeId);
                      
                      // Get the most recent bonus for this employee from existing payroll records
                      const employeePayrollRecords = payrollRecords.filter(
                        pr => (pr.employee?._id || pr.employee) === employeeId && parseFloat(pr.bonuses || 0) > 0
                      );
                      const mostRecentBonus = employeePayrollRecords.length > 0 
                        ? employeePayrollRecords.sort((a, b) => {
                            const dateA = new Date(a.payPeriod || a.createdAt || 0);
                            const dateB = new Date(b.payPeriod || b.createdAt || 0);
                            return dateB - dateA;
                          })[0]?.bonuses || 0
                        : 0;
                      
                      setPayrollForm({
                        ...payrollForm,
                        employeeId: employeeId,
                        baseSalary: employeeSalary?.baseSalary?.toString() || emp?.salary?.baseSalary?.toString() || "",
                        bonuses: mostRecentBonus > 0 ? mostRecentBonus.toString() : "",
                        currency: employeeSalary?.currency || userCurrency,
                        netPay: calculateNetPay(
                          employeeSalary?.baseSalary?.toString() || emp?.salary?.baseSalary?.toString() || "",
                          mostRecentBonus > 0 ? mostRecentBonus.toString() : "",
                          payrollForm.deductions,
                          payrollForm.tax
                        )
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pay Period *</label>
                  <input
                    type="month"
                    value={payrollForm.payPeriod}
                    onChange={(e) => setPayrollForm({ ...payrollForm, payPeriod: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Base Salary *</label>
                  <input
                    type="number"
                    value={payrollForm.baseSalary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayrollForm({
                        ...payrollForm,
                        baseSalary: val,
                        netPay: calculateNetPay(val, payrollForm.bonuses, payrollForm.deductions, payrollForm.tax)
                      });
                    }}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bonuses</label>
                  <input
                    type="number"
                    value={payrollForm.bonuses}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayrollForm({
                        ...payrollForm,
                        bonuses: val,
                        netPay: calculateNetPay(payrollForm.baseSalary, val, payrollForm.deductions, payrollForm.tax)
                      });
                    }}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Deductions</label>
                  <input
                    type="number"
                    value={payrollForm.deductions}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayrollForm({
                        ...payrollForm,
                        deductions: val,
                        netPay: calculateNetPay(payrollForm.baseSalary, payrollForm.bonuses, val, payrollForm.tax)
                      });
                    }}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tax</label>
                  <input
                    type="number"
                    value={payrollForm.tax}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayrollForm({
                        ...payrollForm,
                        tax: val,
                        netPay: calculateNetPay(payrollForm.baseSalary, payrollForm.bonuses, payrollForm.deductions, val)
                      });
                    }}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Net Pay (Calculated)</label>
                <input
                  type="text"
                  value={formatCurrency(payrollForm.netPay || 0, payrollForm.currency || userCurrency)}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Currency</label>
                  <select
                    value={payrollForm.currency || userCurrency}
                    onChange={(e) => setPayrollForm({ ...payrollForm, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={payrollForm.paymentMethod}
                    onChange={(e) => setPayrollForm({ ...payrollForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={payrollForm.paymentDate}
                  onChange={(e) => setPayrollForm({ ...payrollForm, paymentDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={payrollForm.status}
                  onChange={(e) => setPayrollForm({ ...payrollForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  {PAYROLL_STATUS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  value={payrollForm.notes}
                  onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 dark:border-blue-600">
                  {editingPayroll ? "Update" : "Create"} Payroll
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowPayrollModal(false);
                    setEditingPayroll(null);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Benefit Modal */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowBenefitModal(false);
            setEditingBenefit(null);
          }
        }}>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingBenefit ? "Edit Benefit" : "Add Benefit"}
              </h2>
            </div>
            <form onSubmit={handleBenefitSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee *</label>
                  <select
                    value={benefitForm.employeeId}
                    onChange={(e) => {
                      const employeeId = e.target.value;
                      const employeeSalary = getEmployeeSalary(employeeId);
                      const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                      
                      // Recalculate contributions if percentages are already set and using percentage type
                      let employeeContribution = benefitForm.employeeContribution || 0;
                      let employerContribution = benefitForm.employerContribution || 0;
                      
                      if (benefitForm.employeeContributionType === "percentage" && benefitForm.employeeContributionPercent) {
                        employeeContribution = baseSalary > 0 ? (baseSalary * parseFloat(benefitForm.employeeContributionPercent) / 100) : 0;
                      }
                      if (benefitForm.employerContributionType === "percentage" && benefitForm.employerContributionPercent) {
                        employerContribution = baseSalary > 0 ? (baseSalary * parseFloat(benefitForm.employerContributionPercent) / 100) : 0;
                      }
                      
                      setBenefitForm({ 
                        ...benefitForm, 
                        employeeId: employeeId,
                        employeeContribution: employeeContribution.toFixed(2),
                        employerContribution: employerContribution.toFixed(2),
                        currency: employeeSalary?.currency || userCurrency
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                  {benefitForm.employeeId && (() => {
                    const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                    return employeeSalary ? (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Base Salary: {formatCurrency(employeeSalary.baseSalary || 0, employeeSalary.currency || userCurrency)}
                      </p>
                    ) : (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        No salary set for this employee
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Benefit Type *</label>
                  <select
                    value={benefitForm.type}
                    onChange={(e) => setBenefitForm({ ...benefitForm, type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {BENEFIT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Provider</label>
                  <input
                    type="text"
                    value={benefitForm.provider}
                    onChange={(e) => setBenefitForm({ ...benefitForm, provider: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={benefitForm.planName}
                    onChange={(e) => setBenefitForm({ ...benefitForm, planName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Coverage Amount</label>
                  <input
                    type="number"
                    value={benefitForm.coverageAmount}
                    onChange={(e) => setBenefitForm({ ...benefitForm, coverageAmount: e.target.value })}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Currency</label>
                  <select
                    value={benefitForm.currency || userCurrency}
                    onChange={(e) => setBenefitForm({ ...benefitForm, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Employee Contribution</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="employeeContributionType"
                          value="percentage"
                          checked={benefitForm.employeeContributionType === "percentage"}
                          onChange={(e) => {
                            const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                            const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                            const amount = baseSalary > 0 ? (baseSalary * parseFloat(benefitForm.employeeContributionPercent || 0) / 100) : 0;
                            setBenefitForm({ 
                              ...benefitForm, 
                              employeeContributionType: "percentage",
                              employeeContribution: amount.toFixed(2)
                            });
                          }}
                          className="w-3 h-3"
                        />
                        <span>%</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="employeeContributionType"
                          value="amount"
                          checked={benefitForm.employeeContributionType === "amount"}
                          onChange={(e) => {
                            const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                            const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                            const percent = baseSalary > 0 ? ((parseFloat(benefitForm.employeeContribution || 0) / baseSalary) * 100) : 0;
                            setBenefitForm({ 
                              ...benefitForm, 
                              employeeContributionType: "amount",
                              employeeContributionPercent: percent.toFixed(2)
                            });
                          }}
                          className="w-3 h-3"
                        />
                        <span>Amount</span>
                      </label>
                    </div>
                  </div>
                  {benefitForm.employeeContributionType === "percentage" ? (
                    <>
                      <input
                        type="number"
                        value={benefitForm.employeeContributionPercent}
                        onChange={(e) => {
                          const percent = e.target.value;
                          const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                          const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                          const amount = baseSalary > 0 ? (baseSalary * parseFloat(percent || 0) / 100) : 0;
                          setBenefitForm({ 
                            ...benefitForm, 
                            employeeContributionPercent: percent,
                            employeeContribution: amount.toFixed(2)
                          });
                        }}
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g., 5"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                      />
                      {benefitForm.employeeId && benefitForm.employeeContributionPercent && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          Amount: {formatCurrency(benefitForm.employeeContribution || 0, benefitForm.currency || userCurrency)}
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      type="number"
                      value={benefitForm.employeeContribution}
                      onChange={(e) => {
                        const amount = e.target.value;
                        const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                        const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                        const percent = baseSalary > 0 ? ((parseFloat(amount || 0) / baseSalary) * 100) : 0;
                        setBenefitForm({ 
                          ...benefitForm, 
                          employeeContribution: amount,
                          employeeContributionPercent: percent.toFixed(2)
                        });
                      }}
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Employer Contribution</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="employerContributionType"
                          value="percentage"
                          checked={benefitForm.employerContributionType === "percentage"}
                          onChange={(e) => {
                            const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                            const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                            const amount = baseSalary > 0 ? (baseSalary * parseFloat(benefitForm.employerContributionPercent || 0) / 100) : 0;
                            setBenefitForm({ 
                              ...benefitForm, 
                              employerContributionType: "percentage",
                              employerContribution: amount.toFixed(2)
                            });
                          }}
                          className="w-3 h-3"
                        />
                        <span>%</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="employerContributionType"
                          value="amount"
                          checked={benefitForm.employerContributionType === "amount"}
                          onChange={(e) => {
                            const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                            const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                            const percent = baseSalary > 0 ? ((parseFloat(benefitForm.employerContribution || 0) / baseSalary) * 100) : 0;
                            setBenefitForm({ 
                              ...benefitForm, 
                              employerContributionType: "amount",
                              employerContributionPercent: percent.toFixed(2)
                            });
                          }}
                          className="w-3 h-3"
                        />
                        <span>Amount</span>
                      </label>
                    </div>
                  </div>
                  {benefitForm.employerContributionType === "percentage" ? (
                    <>
                      <input
                        type="number"
                        value={benefitForm.employerContributionPercent}
                        onChange={(e) => {
                          const percent = e.target.value;
                          const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                          const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                          const amount = baseSalary > 0 ? (baseSalary * parseFloat(percent || 0) / 100) : 0;
                          setBenefitForm({ 
                            ...benefitForm, 
                            employerContributionPercent: percent,
                            employerContribution: amount.toFixed(2)
                          });
                        }}
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g., 10"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                      />
                      {benefitForm.employeeId && benefitForm.employerContributionPercent && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          Amount: {formatCurrency(benefitForm.employerContribution || 0, benefitForm.currency || userCurrency)}
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      type="number"
                      value={benefitForm.employerContribution}
                      onChange={(e) => {
                        const amount = e.target.value;
                        const employeeSalary = getEmployeeSalary(benefitForm.employeeId);
                        const baseSalary = parseFloat(employeeSalary?.baseSalary || 0);
                        const percent = baseSalary > 0 ? ((parseFloat(amount || 0) / baseSalary) * 100) : 0;
                        setBenefitForm({ 
                          ...benefitForm, 
                          employerContribution: amount,
                          employerContributionPercent: percent.toFixed(2)
                        });
                      }}
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={benefitForm.startDate}
                    onChange={(e) => setBenefitForm({ ...benefitForm, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={benefitForm.endDate}
                    onChange={(e) => setBenefitForm({ ...benefitForm, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={benefitForm.status}
                  onChange={(e) => setBenefitForm({ ...benefitForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  value={benefitForm.notes}
                  onChange={(e) => setBenefitForm({ ...benefitForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 dark:border-blue-600">
                  {editingBenefit ? "Update" : "Add"} Benefit
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowBenefitModal(false);
                    setEditingBenefit(null);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrPayroll;
