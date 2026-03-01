import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";

const Suppliers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    country: "",
    taxId: "",
    category: "",
  });

  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("suppliers");
    const seedSuppliers = [
      {
        id: 1,
        name: "ABC Supplies Co.",
        email: "contact@abcsupplies.com",
        phone: "+1 234 567 8900",
        company: "ABC Supplies Co.",
        address: "789 Industrial Blvd, Chicago, IL 60601",
        category: "Office Supplies",
        totalOrders: 24,
        totalSpent: "$32,450",
      },
      {
        id: 2,
        name: "Tech Equipment Ltd",
        email: "info@techequip.com",
        phone: "+1 234 567 8902",
        company: "Tech Equipment Ltd",
        address: "321 Tech Park, San Francisco, CA 94102",
        category: "Technology",
        totalOrders: 15,
        totalSpent: "$48,900",
      },
    ];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSuppliers(parsed);
        return;
      }
    }

    setSuppliers(seedSuppliers);
    localStorage.setItem("suppliers", JSON.stringify(seedSuppliers));
  }, []);

  useEffect(() => {
    localStorage.setItem("suppliers", JSON.stringify(suppliers));
    window.dispatchEvent(new Event("suppliersUpdated"));
  }, [suppliers]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      company: supplier.company || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "",
      taxId: supplier.taxId || "",
      category: supplier.category || "",
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = (supplierId) => {
    const confirmed = window.confirm("Delete this supplier?");
    if (!confirmed) return;
    const nextSuppliers = suppliers.filter((supplier) => supplier.id !== supplierId);
    setSuppliers(nextSuppliers);
    localStorage.setItem("suppliers", JSON.stringify(nextSuppliers));
    window.dispatchEvent(new Event("suppliersUpdated"));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSupplier) {
      const nextSuppliers = suppliers.map((supplier) =>
        supplier.id === editingSupplier.id
          ? {
              ...supplier,
              ...formData,
            }
          : supplier
      );
      setSuppliers(nextSuppliers);
      localStorage.setItem("suppliers", JSON.stringify(nextSuppliers));
      window.dispatchEvent(new Event("suppliersUpdated"));
    } else {
      const newSupplier = {
        id: Date.now(),
        ...formData,
        totalOrders: 0,
        totalSpent: formatCurrency(0, userCurrency),
        currency: userCurrency,
      };
      const nextSuppliers = [newSupplier, ...suppliers];
      setSuppliers(nextSuppliers);
      localStorage.setItem("suppliers", JSON.stringify(nextSuppliers));
      window.dispatchEvent(new Event("suppliersUpdated"));
    }
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      country: "",
      taxId: "",
      category: "",
    });
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    (supplier.name || supplier.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t("suppliers.title")}</h1>
          <p className="text-gray-600 dark:text-white">{t("suppliers.subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{t("suppliers.add")}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search suppliers by name, email, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-900" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {supplier.company || supplier.name}
                  </h3>
                  <p className="text-sm text-gray-600">{supplier.category}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => handleEditSupplier(supplier)}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => handleDeleteSupplier(supplier.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{supplier.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{supplier.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{supplier.address}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-semibold text-gray-900">{supplier.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(
                    typeof supplier.totalSpent === "number"
                      ? supplier.totalSpent
                      : typeof supplier.totalSpent === "string"
                        ? parseFloat(String(supplier.totalSpent).replace(/[^\d.-]/g, "")) || 0
                        : 0,
                    supplier.currency || userCurrency
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC Supplies Co."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@supplier.com"
                    required
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
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Technology">Technology</option>
                    <option value="Services">Services</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
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
                    placeholder="Chicago"
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
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  {editingSupplier ? "Save Changes" : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
