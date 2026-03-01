import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Package, FileSpreadsheet, Upload } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";

const Items = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || 'GHS';
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    unit: "unit",
    sku: "",
    taxRate: "",
    trackStock: false,
    quantityInStock: "",
    reorderLevel: "",
  });

  // Default categories (fallback)
  const defaultCategories = [
    { id: 1, name: "Products", color: "#3B82F6" },
    { id: 2, name: "Services", color: "#10B981" },
    { id: 3, name: "Software", color: "#8B5CF6" },
    { id: 4, name: "Hardware", color: "#F59E0B" },
  ];

  const [categories, setCategories] = useState(defaultCategories);

  // Sample items data - prices stored as numbers, will be formatted when displayed
  const getDefaultItems = () => [
    {
      id: 1,
      name: "Web Design Service",
      description: "Professional website design and development",
      category: "Services",
      categoryColor: "#10B981",
      price: formatCurrency(1500, userCurrency),
      unit: "project",
      sku: "WD-001",
      usageCount: 15,
    },
    {
      id: 2,
      name: "Business Laptop",
      description: "Dell XPS 15, 16GB RAM, 512GB SSD",
      category: "Hardware",
      categoryColor: "#F59E0B",
      price: formatCurrency(1200, userCurrency),
      unit: "unit",
      sku: "HW-002",
      usageCount: 8,
    },
    {
      id: 3,
      name: "Adobe Creative Cloud",
      description: "Annual subscription for full creative suite",
      category: "Software",
      categoryColor: "#8B5CF6",
      price: formatCurrency(599, userCurrency),
      unit: "year",
      sku: "SW-003",
      usageCount: 12,
    },
  ];

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
        const data = Array.isArray(response.data) ? response.data : [];
        setItems(data.map((i) => ({
          ...i,
          id: i._id || i.id,
          price: typeof i.price === "number" ? formatCurrency(i.price, userCurrency) : i.price,
        })));
      } catch (err) {
        const saved = localStorage.getItem("items");
        const fallbackItems = saved ? JSON.parse(saved) : getDefaultItems();
        // Format prices in fallback items if they're numbers
        setItems(fallbackItems.map((i) => ({
          ...i,
          price: typeof i.price === "number" ? formatCurrency(i.price, userCurrency) : i.price,
        })));
      } finally {
        setItemsLoading(false);
      }
    };
    loadItems();
  }, [userCurrency]); // Reload items when currency changes to reformat prices

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.CATEGORIES.GET_ALL);
        const data = Array.isArray(response.data) ? response.data : [];
        setCategories(data.map((c) => ({ ...c, id: c._id || c.id })));
      } catch (err) {
        const saved = localStorage.getItem("categories");
        setCategories(saved ? JSON.parse(saved) : defaultCategories);
      }
    };

    loadCategories();

    const handleStorage = (event) => {
      if (event.key === "categories") {
        loadCategories();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const openAddItem = () => {
    setEditingItemId(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      unit: "unit",
      sku: "",
      taxRate: "",
      trackStock: false,
      quantityInStock: "",
      reorderLevel: "",
    });
    setShowModal(true);
  };

  const openEditItem = (item) => {
    setEditingItemId(item.id || item._id);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      price: String(item.price || "").replace(/[^0-9.]/g, ""),
      unit: item.unit || "unit",
      sku: item.sku || "",
      taxRate: item.taxRate || "",
      trackStock: Boolean(item.trackStock),
      quantityInStock: item.quantityInStock != null ? String(item.quantityInStock) : "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
    });
    setShowModal(true);
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await axiosInstance.delete(API_PATHS.ITEMS.DELETE(itemId));
      setItems((prev) => prev.filter((item) => (item.id || item._id) !== itemId));
    } catch (err) {
      const updated = items.filter((item) => (item.id || item._id) !== itemId);
      setItems(updated);
      localStorage.setItem("items", JSON.stringify(updated));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedCategory = categories.find((cat) => cat.name === formData.category) || categories.find((cat) => String(cat.id) === String(formData.category));
    const categoryName = selectedCategory?.name || formData.category;
    const categoryColor = selectedCategory?.color || "#3B82F6";
    const normalizedPrice = Number(formData.price || 0);

    try {
      if (editingItemId) {
        const response = await axiosInstance.put(API_PATHS.ITEMS.UPDATE(editingItemId), {
          name: formData.name,
          description: formData.description,
          category: categoryName,
          categoryColor,
          price: normalizedPrice,
          unit: formData.unit,
          sku: formData.sku,
          taxRate: formData.taxRate,
          trackStock: formData.trackStock,
          quantityInStock: formData.trackStock ? Number(formData.quantityInStock) || 0 : 0,
          reorderLevel: formData.trackStock ? Number(formData.reorderLevel) || 0 : 0,
        });
        const updated = response.data;
        setItems((prev) => prev.map((item) =>
          (item.id || item._id) === editingItemId
            ? { ...updated, id: updated._id, price: formatCurrency(Number(updated.price), userCurrency) }
            : item
        ));
      } else {
        const response = await axiosInstance.post(API_PATHS.ITEMS.CREATE, {
          name: formData.name,
          description: formData.description,
          category: categoryName,
          categoryColor,
          price: normalizedPrice,
          unit: formData.unit,
          sku: formData.sku,
          taxRate: formData.taxRate,
          trackStock: formData.trackStock,
          quantityInStock: formData.trackStock ? Number(formData.quantityInStock) || 0 : 0,
          reorderLevel: formData.trackStock ? Number(formData.reorderLevel) || 0 : 0,
        });
        const newItem = response.data;
        setItems((prev) => [{
          ...newItem,
          id: newItem._id,
          price: formatCurrency(Number(newItem.price), userCurrency),
        }, ...prev]);
      }
    } catch (err) {
      const selectedCat = categories.find((cat) => String(cat.id) === String(formData.category));
      if (editingItemId) {
        const updated = items.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                name: formData.name,
                description: formData.description,
                category: selectedCat?.name || formData.category,
                categoryColor: selectedCat?.color || item.categoryColor,
                price: formatCurrency(normalizedPrice, userCurrency),
                unit: formData.unit,
                sku: formData.sku,
                taxRate: formData.taxRate,
              }
            : item
        );
        setItems(updated);
        localStorage.setItem("items", JSON.stringify(updated));
      } else {
        const newItem = {
          id: Date.now(),
          name: formData.name,
          description: formData.description,
          category: selectedCat?.name || formData.category,
          categoryColor: selectedCat?.color || "#3B82F6",
          price: `GH₵ ${normalizedPrice.toLocaleString()}`,
          unit: formData.unit,
          sku: formData.sku,
          taxRate: formData.taxRate,
          usageCount: 0,
        };
        setItems((prev) => [newItem, ...prev]);
        localStorage.setItem("items", JSON.stringify([newItem, ...items]));
      }
    }
    setShowModal(false);
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      unit: "unit",
      sku: "",
      taxRate: "",
      trackStock: false,
      quantityInStock: "",
      reorderLevel: "",
    });
  };

  const filteredItems = items.filter((item) => {
    const term = (searchTerm || "").toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term)
    );
  });

  const productTemplateHeaders = [
    "name",
    "description",
    "category",
    "price",
    "unit",
    "sku",
    "tax rate",
    "track stock",
    "quantity in stock",
    "reorder level",
  ];

  const downloadTemplate = () => {
    const headerRow = productTemplateHeaders.join(",");
    const exampleRow = [
      "Sample Product",
      "Short description",
      "Products",
      "100",
      "unit",
      "SKU-001",
      "0",
      "false",
      "0",
      "10",
    ].map((c) => (String(c).includes(",") ? `"${c}"` : c)).join(",");
    const csv = [headerRow, exampleRow].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    setImportMessage(null);
  };

  const handleImportFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setImportMessage(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axiosInstance.post(API_PATHS.ITEMS.IMPORT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data;
      setImportMessage({
        type: "success",
        text: data.message + (data.errors?.length ? ` ${data.errors.length} row(s) had errors.` : ""),
      });
      if (data.created > 0) {
        const listRes = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
        const dataList = Array.isArray(listRes.data) ? listRes.data : [];
        setItems(
          dataList.map((i) => ({
            ...i,
            id: i._id || i.id,
            price: typeof i.price === "number" ? formatCurrency(i.price, userCurrency) : i.price,
          }))
        );
      }
    } catch (err) {
      setImportMessage({
        type: "error",
        text: err.response?.data?.message || err.message || "Import failed",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Items</h1>
          <p className="text-gray-600 dark:text-white">Manage your products and services</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Download template</span>
          </button>
          <label className="flex items-center space-x-2 px-4 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
              disabled={importing}
            />
            {importing ? (
              <span className="animate-pulse">Importing…</span>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Import from Excel/CSV</span>
              </>
            )}
          </label>
          <button
            onClick={openAddItem}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>
      {importMessage && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${
            importMessage.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
          }`}
        >
          {importMessage.text}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search items by name, SKU, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Items Grid */}
      {itemsLoading ? (
        <div className="text-center py-12 text-gray-500">Loading your catalog...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openEditItem(item)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

            <div className="flex items-center space-x-2 mb-4">
              <div
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: item.categoryColor }}
              >
                {item.category}
              </div>
              <span className="text-xs text-gray-500">{item.unit}</span>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="text-xl font-bold text-gray-900">{item.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Used in</p>
                  <p className="text-lg font-semibold text-blue-900">{item.usageCount} invoices</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingItemId ? "Edit Item" : "Add New Item"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Web Design Service"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Describe this item..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU / Item Code
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., WD-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="unit">Unit</option>
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                    <option value="project">Project</option>
                    <option value="piece">Piece</option>
                    <option value="kg">Kilogram</option>
                    <option value="lb">Pound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="trackStock"
                    name="trackStock"
                    checked={formData.trackStock}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-900 focus:ring-blue-500"
                  />
                  <label htmlFor="trackStock" className="text-sm font-medium text-gray-700">
                    Track stock (manage in Stock Management)
                  </label>
                </div>
                {formData.trackStock && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity in stock
                      </label>
                      <input
                        type="number"
                        name="quantityInStock"
                        value={formData.quantityInStock}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reorder level (alert when at or below)
                      </label>
                      <input
                        type="number"
                        name="reorderLevel"
                        value={formData.reorderLevel}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                  </>
                )}
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
                  {editingItemId ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
