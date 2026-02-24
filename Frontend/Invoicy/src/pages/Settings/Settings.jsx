import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Lock, User, Building2, CreditCard, Users, Plus, Edit2, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import PRICING_PLANS from "../../utils/data";
import { CURRENCY_OPTIONS as CURRENCY_OPTIONS_LIST } from "../../utils/countriesCurrencies";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [companyForm, setCompanyForm] = useState({
    businessName: "",
    tin: "",
    address: "",
    phone: "",
    companyLogo: "",
    companySignature: "",
    companyStamp: "",
    currency: "GHS",
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [employeesWithoutUser, setEmployeesWithoutUser] = useState([]);
  const [employeesWithoutUserLoading, setEmployeesWithoutUserLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [userForm, setUserForm] = useState({
    employeeId: "",
    name: "",
    email: "",
    password: "",
    editPassword: "",
    role: "staff",
    responsibilities: [],
  });
  const [securityPassword, setSecurityPassword] = useState({ current: "", new: "", confirm: "" });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [exchangeFrom, setExchangeFrom] = useState("GHS");
  const [exchangeTo, setExchangeTo] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState("");
  const [amountToConvert, setAmountToConvert] = useState("");
  const [rateDirection, setRateDirection] = useState("toFrom"); // "toFrom" = 1 To = ? From (e.g. 1 USD = 12.5 GHS), "fromTo" = 1 From = ? To

  const RESPONSIBILITIES = [
    { id: "dashboard", label: "Dashboard (view)", description: "View dashboard and insights" },
    { id: "invoices", label: "Invoices", description: "Create, edit, and manage invoices" },
    { id: "customers", label: "Customers", description: "Manage customer records" },
    { id: "suppliers", label: "Suppliers", description: "Manage supplier records" },
    { id: "categories", label: "Categories", description: "Manage product categories" },
    { id: "items", label: "Items", description: "Manage products and services" },
    { id: "reports", label: "Reports", description: "View and generate reports" },
    { id: "hr", label: "HR (full access)", description: "All HR modules: records, payroll, attendance, onboarding, etc." },
    { id: "hr_records", label: "Employee Data & Records", description: "Employee records and data only" },
    { id: "hr_payroll", label: "Payroll & Benefits", description: "Payroll and benefits only" },
    { id: "hr_attendance", label: "Time & Attendance", description: "Time and attendance only" },
    { id: "hr_onboarding", label: "Onboarding & Offboarding", description: "Onboarding and offboarding only" },
    { id: "hr_performance", label: "Performance & Talent", description: "Performance and talent only" },
    { id: "hr_recruitment", label: "Recruitment & ATS", description: "Recruitment and ATS only" },
    { id: "hr_self_service", label: "Employee Self-Service", description: "Employee self-service only" },
    { id: "hr_compliance", label: "Legal & Compliance Templates", description: "HR legal and compliance templates only" },
    { id: "settings", label: "Settings", description: "Manage account and team settings" },
  ];

  const RESPONSIBILITY_LABELS = Object.fromEntries(RESPONSIBILITIES.map((r) => [r.id, r.label]));

  useEffect(() => {
    setCompanyForm({
      businessName: user?.businessName || "",
      tin: user?.tin || "",
      address: user?.address || "",
      phone: user?.phone || "",
      companyLogo: user?.companyLogo || "",
      companySignature: user?.companySignature || "",
      companyStamp: user?.companyStamp || "",
      currency: user?.currency || "GHS",
    });
    setExchangeFrom(user?.currency || "GHS");
  }, [user]);

  const isAdminOrOwner = user?.role === 'owner' || user?.role === 'admin';

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

  const fetchTeamMembers = async () => {
    setTeamLoading(true);
    try {
      const response = await axiosInstance.get(API_PATHS.AUTH.TEAM);
      setTeamMembers(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load team members");
    } finally {
      setTeamLoading(false);
    }
  };

  const fetchEmployeesWithoutUser = async () => {
    setEmployeesWithoutUserLoading(true);
    try {
      const res = await axiosInstance.get(API_PATHS.EMPLOYEES.WITHOUT_USER);
      setEmployeesWithoutUser(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
      setEmployeesWithoutUser([]);
    } finally {
      setEmployeesWithoutUserLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "team") fetchTeamMembers();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "team" && showCreateUser) fetchEmployeesWithoutUser();
  }, [activeTab, showCreateUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    try {
      await axiosInstance.post(API_PATHS.AUTH.TEAM, {
        employeeId: userForm.employeeId,
        password: userForm.password,
        role: userForm.role,
        responsibilities: userForm.responsibilities,
      });
      toast.success("Employee added to team");
      setUserForm({ employeeId: "", name: "", email: "", password: "", editPassword: "", role: "staff", responsibilities: [] });
      setShowCreateUser(false);
      fetchTeamMembers();
      fetchEmployeesWithoutUser();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add to team");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingMemberId) return;
    const payload = { role: userForm.role, responsibilities: userForm.responsibilities };
    if (userForm.editPassword && userForm.editPassword.length >= 6) {
      payload.password = userForm.editPassword;
    }
    try {
      await axiosInstance.put(API_PATHS.AUTH.TEAM_MEMBER(editingMemberId), payload);
      toast.success("User updated successfully");
      setEditingMemberId(null);
      setUserForm({ name: "", email: "", password: "", editPassword: "", role: "staff", responsibilities: [] });
      fetchTeamMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const toggleResponsibility = (id) => {
    const arr = [...userForm.responsibilities];
    const idx = arr.indexOf(id);
    if (idx === -1) arr.push(id);
    else arr.splice(idx, 1);
    setUserForm((prev) => ({ ...prev, responsibilities: arr }));
  };

  const openEditMember = (member) => {
    setEditingMemberId(member._id);
    setUserForm({
      name: member.name,
      email: member.email,
      password: "",
      editPassword: "",
      role: member.role || "staff",
      responsibilities: member.responsibilities || [],
    });
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (securityPassword.new.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (securityPassword.new !== securityPassword.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setUpdatingPassword(true);
    try {
      await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, {
        currentPassword: securityPassword.current,
        newPassword: securityPassword.new,
      });
      toast.success("Password updated successfully");
      setSecurityPassword({ current: "", new: "", confirm: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteUser = async (member) => {
    if (!window.confirm(`Remove ${member.name} from the team? They will no longer be able to sign in.`)) return;
    try {
      await axiosInstance.delete(API_PATHS.AUTH.TEAM_MEMBER(member._id));
      toast.success("User removed from team");
      fetchTeamMembers();
      if (editingMemberId === member._id) {
        setEditingMemberId(null);
        setUserForm({ name: "", email: "", password: "", editPassword: "", role: "staff", responsibilities: [] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove user");
    }
  };

  // Resize/compress image to avoid "payload too large" and save failures (max 400px, JPEG 0.85)
  const compressImageAsDataUrl = (file, maxSize = 400, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.min(maxSize / w, maxSize / h, 1);
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        try {
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  };

  const handleCompanyLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageAsDataUrl(file);
      setCompanyForm((prev) => ({ ...prev, companyLogo: dataUrl }));
    } catch (err) {
      toast.error("Could not process image. Try a smaller file.");
    }
  };

  const handleCompanySignatureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageAsDataUrl(file);
      setCompanyForm((prev) => ({ ...prev, companySignature: dataUrl }));
    } catch (err) {
      toast.error("Could not process image. Try a smaller file.");
    }
  };

  const handleCompanyStampChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageAsDataUrl(file);
      setCompanyForm((prev) => ({ ...prev, companyStamp: dataUrl }));
    } catch (err) {
      toast.error("Could not process image. Try a smaller file.");
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      const response = await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, companyForm);
      updateUser(response.data);
      toast.success("Company details saved");
    } catch (error) {
      console.error("Failed to update company profile:", error);
      toast.error(error.response?.data?.message || "Failed to save company details");
    } finally {
      setSavingCompany(false);
    }
  };

  const tabs = [
    { id: "general", name: "General", icon: User },
    { id: "company", name: "Company", icon: Building2 },
    { id: "team", name: "Team", icon: Users },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Lock },
    { id: "billing", name: "Billing", icon: CreditCard },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-white">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeTab === "general" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>UTC (GMT+0:00)</option>
                      <option>EST (GMT-5:00)</option>
                      <option>PST (GMT-8:00)</option>
                    </select>
                  </div>
                  <button className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "company" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCompanyLogoChange}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                    {companyForm.companyLogo && (
                      <img
                        src={companyForm.companyLogo}
                        alt="Company logo preview"
                        className="mt-3 h-16 w-auto object-contain border border-slate-200 rounded bg-white p-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signature
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCompanySignatureChange}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                    {companyForm.companySignature && (
                      <img
                        src={companyForm.companySignature}
                        alt="Signature preview"
                        className="mt-3 h-16 w-auto object-contain border border-slate-200 rounded bg-white p-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Stamp
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCompanyStampChange}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                    {companyForm.companyStamp && (
                      <img
                        src={companyForm.companyStamp}
                        alt="Company stamp preview"
                        className="mt-3 h-16 w-auto object-contain border border-slate-200 rounded bg-white p-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter company name"
                      value={companyForm.businessName}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TIN (Tax ID)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter TIN / Tax ID"
                      value={companyForm.tin}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, tin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Address
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Enter company address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  {isAdminOrOwner && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Organization Currency
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Set the default currency for your organization. This will be used throughout the application for invoices, reports, and financial calculations.
                      </p>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        value={companyForm.currency}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, currency: e.target.value }))}
                      >
                        {currencyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Exchange rate conversion */}
                  {isAdminOrOwner && (
                    <div className="border-t border-gray-200 dark:border-slate-600 pt-6 mt-6">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Exchange rate conversion</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Convert amounts between currencies. Choose how you enter the rate (e.g. 1 USD = 12.5 GHS or 1 GHS = 0.08 USD), then enter the rate and an amount.
                      </p>
                      <div className="flex flex-wrap gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rateDirection"
                            checked={rateDirection === "toFrom"}
                            onChange={() => setRateDirection("toFrom")}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">1 {exchangeTo} = ? {exchangeFrom}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rateDirection"
                            checked={rateDirection === "fromTo"}
                            onChange={() => setRateDirection("fromTo")}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">1 {exchangeFrom} = ? {exchangeTo}</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            value={exchangeFrom}
                            onChange={(e) => setExchangeFrom(e.target.value)}
                          >
                            {CURRENCY_OPTIONS_LIST.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            value={exchangeTo}
                            onChange={(e) => setExchangeTo(e.target.value)}
                          >
                            {CURRENCY_OPTIONS_LIST.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-end gap-3 mb-3">
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Rate ({rateDirection === "toFrom" ? `1 ${exchangeTo} = ? ${exchangeFrom}` : `1 ${exchangeFrom} = ? ${exchangeTo}`})
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder={rateDirection === "toFrom" ? "e.g. 12.5" : "e.g. 0.08"}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount to convert ({exchangeFrom})</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Amount"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            value={amountToConvert}
                            onChange={(e) => setAmountToConvert(e.target.value)}
                          />
                        </div>
                      </div>
                      {exchangeRate !== "" && amountToConvert !== "" && !isNaN(parseFloat(exchangeRate)) && parseFloat(exchangeRate) > 0 && !isNaN(parseFloat(amountToConvert)) && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>{parseFloat(amountToConvert).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {exchangeFrom}</strong>
                          {" = "}
                          <strong>
                            {(rateDirection === "toFrom"
                              ? parseFloat(amountToConvert) / parseFloat(exchangeRate)
                              : parseFloat(amountToConvert) * parseFloat(exchangeRate)
                            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                            {exchangeTo}
                          </strong>
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
                    onClick={handleSaveCompany}
                    disabled={savingCompany}
                  >
                    {savingCompany ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "team" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-black dark:text-white">Team</h2>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">Select employees created by HR and assign their role and responsibilities.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateUser(true);
                      setEditingMemberId(null);
                      setUserForm({ employeeId: "", name: "", email: "", password: "", role: "staff", responsibilities: [] });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add to team
                  </button>
                </div>

                {showCreateUser && (
                  <form onSubmit={handleCreateUser} className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50 dark:bg-slate-900/50 dark:border-slate-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add employee to team</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Select an employee created by HR and assign their role and responsibilities.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Employee *</label>
                        <select
                          required
                          value={userForm.employeeId}
                          onChange={(e) => {
                            const id = e.target.value;
                            const emp = employeesWithoutUser.find((x) => x._id === id);
                            setUserForm((prev) => ({
                              ...prev,
                              employeeId: id,
                              name: emp ? [emp.firstName, emp.lastName].filter(Boolean).join(" ") : "",
                              email: emp?.email || "",
                            }));
                          }}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          disabled={employeesWithoutUserLoading}
                        >
                          <option value="">Select an employee...</option>
                          {employeesWithoutUser.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {[emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.email || emp.employeeId || emp._id}
                              {emp.email ? ` (${emp.email})` : ""}
                            </option>
                          ))}
                        </select>
                        {employeesWithoutUser.length === 0 && !employeesWithoutUserLoading && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No employees available to add. Create employees in HR first, then add them here.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Name</label>
                        <input
                          type="text"
                          readOnly
                          value={userForm.name}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Email</label>
                        <input
                          type="email"
                          readOnly
                          value={userForm.email}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Login password *</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={userForm.password}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                          placeholder="Set password for signing in (min 6 characters)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">Admin can manage team. Staff has edit access. Viewer is read-only.</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Responsibilities</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {RESPONSIBILITIES.map((r) => (
                          <label key={r.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={userForm.responsibilities.includes(r.id)}
                              onChange={() => toggleResponsibility(r.id)}
                              className="mt-1 w-4 h-4 text-blue-900 rounded"
                            />
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{r.label}</span>
                              <p className="text-xs text-gray-500 dark:text-slate-300">{r.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
                        Add to team
                      </button>
                      <button type="button" onClick={() => { setShowCreateUser(false); setUserForm((prev) => ({ ...prev, employeeId: "", name: "", email: "", password: "" })); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-900 dark:text-slate-100">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {editingMemberId && (
                  <form onSubmit={handleUpdateUser} className="mb-8 p-6 border border-gray-200 rounded-lg bg-amber-50/50 dark:bg-amber-50/80 dark:border-amber-200 dark:text-black">
                    <h3 className="text-lg font-medium text-black mb-4">Edit role & responsibilities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Name</label>
                        <input type="text" value={userForm.name} readOnly className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-white text-black" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Email</label>
                        <input type="email" value={userForm.email} readOnly className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-white text-black" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-black"
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-black mb-2">Reset password (optional)</label>
                        <input
                          type="password"
                          value={userForm.editPassword}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, editPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-black placeholder-gray-500"
                          placeholder="Enter new password to reset (min 6 characters)"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-black mb-2">Responsibilities</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {RESPONSIBILITIES.map((r) => (
                          <label key={r.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-amber-100/50 cursor-pointer text-black">
                            <input
                              type="checkbox"
                              checked={userForm.responsibilities.includes(r.id)}
                              onChange={() => toggleResponsibility(r.id)}
                              className="mt-1 w-4 h-4 text-blue-900 rounded"
                            />
                            <div>
                              <span className="font-medium text-black">{r.label}</span>
                              <p className="text-xs text-gray-800 dark:text-gray-800">{r.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
                        Save Changes
                      </button>
                      <button type="button" onClick={() => { setEditingMemberId(null); setUserForm({ name: "", email: "", password: "", editPassword: "", role: "staff", responsibilities: [] }); }} className="px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-amber-100/50 text-black">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {teamLoading ? (
                  <div className="text-center py-12 text-gray-500 dark:text-slate-300">Loading team members...</div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-medium text-black">Team Members</h3>
                    {teamMembers.length === 0 ? (
                      <p className="text-gray-500 dark:text-slate-300">No team members yet. Add an employee from HR to get started.</p>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-slate-700">
                        {teamMembers.map((member) => (
                          <div key={member._id} className="py-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-black">{member.name}</p>
                              <p className="text-sm text-black">{member.email}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-900 dark:bg-blue-100 dark:text-black">
                                  {member.role || "staff"}
                                </span>
                                {(member.responsibilities || []).map((r) => (
                                  <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-black dark:bg-gray-300 dark:text-black">
                                    {RESPONSIBILITY_LABELS[r] ?? r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {member.createdBy && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditMember(member)}
                                  className="p-2 text-gray-600 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                                  title="Edit responsibilities"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(member)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                  title="Remove from team"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive email about your account activity</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-blue-900 rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">Invoice Updates</p>
                      <p className="text-sm text-gray-600">Get notified when invoices are paid</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-blue-900 rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">Payment Reminders</p>
                      <p className="text-sm text-gray-600">Reminders for overdue payments</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-blue-900 rounded" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div>
                <h2 className="text-xl font-semibold text-black mb-6">Security Settings</h2>
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={securityPassword.current}
                      onChange={(e) => setSecurityPassword((p) => ({ ...p, current: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={securityPassword.new}
                      onChange={(e) => setSecurityPassword((p) => ({ ...p, new: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={securityPassword.confirm}
                      onChange={(e) => setSecurityPassword((p) => ({ ...p, confirm: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <button type="submit" disabled={updatingPassword} className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60">
                    {updatingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "billing" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Billing & Subscription</h2>
                <div className="space-y-6">
                  {/* Current plan */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">Current plan</h3>
                    {user?.isPlatformAdmin ? (
                      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-slate-300">Platform admin – no subscription required.</p>
                      </div>
                    ) : user?.subscription ? (
                      <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-600 rounded-lg p-4">
                        <p className="text-sm text-blue-900 dark:text-slate-200 font-medium">
                          {user.subscription.plan?.charAt(0).toUpperCase() + (user.subscription.plan?.slice(1) || "")} – {user.subscription.billingInterval === "annual" ? "Annual" : "Monthly"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                          {user.subscription.currency} {user.subscription.amount != null ? (user.subscription.amount / 100).toFixed(2) : "—"} per {user.subscription.billingInterval === "annual" ? "year" : "month"}
                        </p>
                        {user.subscription.currentPeriodEnd && (
                          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                            Current period ends: {new Date(user.subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })}
                          </p>
                        )}
                        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          {user.subscription.status === "active" ? "Active" : user.subscription.status || "Active"}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="text-sm text-amber-900 dark:text-amber-200">No active subscription. Choose a plan below to continue using the app.</p>
                      </div>
                    )}
                  </div>

                  {/* Change or update plan */}
                  {!user?.isPlatformAdmin && (
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">Change or update your plan</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                        Select a plan and you’ll be taken to checkout to update your subscription.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PRICING_PLANS.filter((p) => p.name.toLowerCase() !== "enterprise").map((plan) => {
                          const planId = plan.name.toLowerCase();
                          return (
                            <div key={planId} className="flex flex-col gap-2">
                              {["monthly", "annual"].map((interval) => {
                                const price = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
                                const label = interval === "annual" ? "Annual" : "Monthly";
                                const isCurrent = user?.subscription?.plan === planId && user?.subscription?.billingInterval === interval;
                                return (
                                  <div
                                    key={interval}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                      isCurrent
                                        ? "border-blue-500 bg-blue-50 dark:bg-slate-800 dark:border-blue-500"
                                        : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    }`}
                                  >
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">{plan.name} – {label}</p>
                                      <p className="text-sm text-gray-600 dark:text-slate-400">
                                        {plan.currency} {price} / {interval === "annual" ? "year" : "month"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isCurrent}
                                      onClick={() => navigate(`/checkout?plan=${planId}&interval=${interval}`)}
                                      className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-slate-600"
                                    >
                                      {isCurrent ? "Current plan" : "Switch to this plan"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mt-3">
                        Need Enterprise or custom billing? Contact support.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
