import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, User, ArrowRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const norm = (value) => String(value || "").trim().toLowerCase();
const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
  return 0;
};
const csvCell = (value) => {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const Customers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userCurrency = user?.currency || "GHS";
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    country: "",
    taxId: "",
  });

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.CRM.CUSTOMERS);
        const serverCustomers = Array.isArray(res.data) ? res.data : [];
        if (serverCustomers.length > 0) {
          setCustomers(serverCustomers);
          return;
        }

        // One-time migration path: move legacy localStorage customers into backend.
        const saved = localStorage.getItem("customers");
        const localCustomers = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(localCustomers) || localCustomers.length === 0) {
          setCustomers([]);
          return;
        }

        const migrated = [];
        for (const customer of localCustomers) {
          try {
            const createRes = await axiosInstance.post(API_PATHS.CRM.CUSTOMERS, {
              name: customer.name || "",
              email: customer.email || "",
              phone: customer.phone || "",
              company: customer.company || "",
              address: customer.address || "",
              city: customer.city || "",
              country: customer.country || "",
              taxId: customer.taxId || "",
              currency: customer.currency || userCurrency,
            });
            migrated.push(createRes.data);
          } catch (_) {}
        }
        if (migrated.length > 0) {
          localStorage.removeItem("customers");
          setCustomers(migrated);
          return;
        }
        setCustomers([]);
      } catch (_) {
        setCustomers([]);
      }
    };
    loadCustomers();
  }, [userCurrency]);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL_INVOICES);
        setInvoices(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setInvoices([]);
      }
    };
    loadInvoices();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddCustomer = () => {
    setEditingCustomerId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      country: "",
      taxId: "",
    });
    setShowModal(true);
  };

  const openEditCustomer = (customer) => {
    setEditingCustomerId(customer._id || customer.id);
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      address: customer.address || "",
      city: customer.city || "",
      country: customer.country || "",
      taxId: customer.taxId || "",
    });
    setShowModal(true);
  };

  const handleDeleteCustomer = (customerId) => {
    const removeCustomer = async () => {
      try {
        await axiosInstance.delete(API_PATHS.CRM.CUSTOMER(customerId));
        setCustomers((prev) => prev.filter((c) => String(c._id || c.id) !== String(customerId)));
      } catch (_) {}
    };
    removeCustomer();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingCustomerId) {
      try {
        const res = await axiosInstance.put(API_PATHS.CRM.CUSTOMER(editingCustomerId), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          taxId: formData.taxId,
          currency: userCurrency,
        });
        const updatedCustomer = res.data;
        setCustomers((prev) =>
          prev.map((customer) =>
            String(customer._id || customer.id) === String(editingCustomerId) ? updatedCustomer : customer
          )
        );
      } catch (_) {
        return;
      }
    } else {
      try {
        const res = await axiosInstance.post(API_PATHS.CRM.CUSTOMERS, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          taxId: formData.taxId,
          currency: userCurrency,
        });
        setCustomers((prev) => [res.data, ...prev]);
      } catch (_) {
        return;
      }
    }
    setShowModal(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      country: "",
      taxId: "",
    });
  };

  const filteredCustomers = customers.filter((customer) =>
    (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.company || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerTotals = useMemo(() => {
    const totals = {};
    filteredCustomers.forEach((customer) => {
      const customerName = norm(customer.name);
      const customerEmail = norm(customer.email);
      const customerTaxId = norm(customer.taxId);
      const customerCompany = norm(customer.company);
      const matched = invoices.filter((inv) => {
        const billTo = inv?.billTo || {};
        const invName = norm(billTo.clientName);
        const invEmail = norm(billTo.email);
        const invTin = norm(billTo.tin);
        const invBiz = norm(billTo.businessName);
        return (
          (customerName && invName && customerName === invName) ||
          (customerEmail && invEmail && customerEmail === invEmail) ||
          (customerTaxId && invTin && customerTaxId === invTin) ||
          (customerCompany && invBiz && customerCompany === invBiz)
        );
      });

      totals[String(customer._id || customer.id)] = {
        totalInvoices: matched.length,
        totalRevenue: matched.reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0),
      };
    });
    return totals;
  }, [filteredCustomers, invoices]);

  const handleExportCustomerAccounts = () => {
    const header = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Address",
      "City",
      "Country",
      "Tax ID",
      "Currency",
      "Total Invoices",
      "Total Revenue",
    ];

    const rows = customers.map((customer) => {
      const customerName = norm(customer.name);
      const customerEmail = norm(customer.email);
      const customerTaxId = norm(customer.taxId);
      const customerCompany = norm(customer.company);
      const matched = invoices.filter((inv) => {
        const billTo = inv?.billTo || {};
        const invName = norm(billTo.clientName);
        const invEmail = norm(billTo.email);
        const invTin = norm(billTo.tin);
        const invBiz = norm(billTo.businessName);
        return (
          (customerName && invName && customerName === invName) ||
          (customerEmail && invEmail && customerEmail === invEmail) ||
          (customerTaxId && invTin && customerTaxId === invTin) ||
          (customerCompany && invBiz && customerCompany === invBiz)
        );
      });
      const totalInvoices = matched.length;
      const totalRevenue = matched.reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0);

      return [
        customer.name || "",
        customer.email || "",
        customer.phone || "",
        customer.company || "",
        customer.address || "",
        customer.city || "",
        customer.country || "",
        customer.taxId || "",
        customer.currency || userCurrency,
        totalInvoices,
        Number(totalRevenue.toFixed(2)),
      ];
    });

    const csv = [
      header.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-accounts-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Customers</h1>
          <p className="text-gray-600 dark:text-white">{t("customers.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCustomerAccounts}
            className="flex items-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export Accounts</span>
          </button>
          <button
            onClick={openAddCustomer}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{t("customers.add")}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search customers by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer._id || customer.id}
            className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 min-w-0 lg:w-[28%]">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-900" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{customer.company}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:flex-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600 min-w-0">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 min-w-0">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 min-w-0">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{customer.address}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:justify-end lg:w-[34%]">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Total Invoices:</span>
                  <span className="font-semibold text-gray-900">
                    {customerTotals[String(customer._id || customer.id)]?.totalInvoices ?? customer.totalInvoices ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(
                      customerTotals[String(customer._id || customer.id)]?.totalRevenue ??
                        (typeof customer.totalRevenue === "number"
                          ? customer.totalRevenue
                          : typeof customer.totalRevenue === "string"
                            ? parseFloat(String(customer.totalRevenue).replace(/[^\d.-]/g, "")) || 0
                            : 0),
                      customer.currency || userCurrency
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${customer._id || customer.id}`)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  View Account
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditCustomer(customer)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCustomer(customer._id || customer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingCustomerId ? "Edit Customer" : "Add New Customer"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Company Inc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="United States"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID / VAT Number
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123-45-6789"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  {editingCustomerId ? "Save Changes" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
