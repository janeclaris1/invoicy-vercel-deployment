import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Package, FileSpreadsheet, Upload, Coins, ImageIcon, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";

const MAX_ITEM_IMAGE_BYTES = 1.5 * 1024 * 1024;
const DEFAULT_UNITS = ["unit", "hour", "day", "month", "year", "project", "piece", "kg", "lb"];

const Items = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || 'GHS';
  const [showModal, setShowModal] = useState(false);
  const [unitMode, setUnitMode] = useState("preset");
  const [customUnitDraft, setCustomUnitDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    cost: "",
    unit: "unit",
    sku: "",
    taxRate: "",
    trackStock: false,
    quantityInStock: "",
    reorderLevel: "",
    image: "",
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
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkPriceDrafts, setBulkPriceDrafts] = useState({});
  const [importMessage, setImportMessage] = useState(null);
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [inlineCategoryForm, setInlineCategoryForm] = useState({
    name: "",
    color: "#3B82F6",
    description: "",
  });
  const fileInputRef = React.useRef(null);
  const itemImageInputRef = React.useRef(null);
  const activeCategories = categories.filter((cat) => cat?.isActive !== false);

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

  const handleItemImageFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPEG, PNG, or WebP).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_ITEM_IMAGE_BYTES) {
      toast.error("Image must be 1.5 MB or smaller.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image: typeof reader.result === "string" ? reader.result : "" }));
    };
    reader.onerror = () => toast.error("Could not read the image file.");
    reader.readAsDataURL(file);
  };

  const openAddItem = () => {
    setEditingItemId(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      cost: "",
      unit: "unit",
      sku: "",
      taxRate: "",
      trackStock: false,
      quantityInStock: "",
      reorderLevel: "",
      image: "",
    });
    setUnitMode("preset");
    setCustomUnitDraft("");
    setShowModal(true);
    setShowInlineCategoryForm(false);
    setInlineCategoryForm({ name: "", color: "#3B82F6", description: "" });
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  };

  const openEditItem = (item) => {
    const initialUnit = item.unit || "unit";
    const isCustomUnit = !DEFAULT_UNITS.includes(initialUnit);
    setEditingItemId(item.id || item._id);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      price: String(item.price || "").replace(/[^0-9.]/g, ""),
      cost: String(item.cost || "").replace(/[^0-9.]/g, ""),
      unit: initialUnit,
      sku: item.sku || "",
      taxRate: item.taxRate || "",
      trackStock: Boolean(item.trackStock),
      quantityInStock: item.quantityInStock != null ? String(item.quantityInStock) : "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
      image: typeof item.image === "string" ? item.image : "",
    });
    setUnitMode(isCustomUnit ? "custom" : "preset");
    setCustomUnitDraft(isCustomUnit ? initialUnit : "");
    setShowModal(true);
    setShowInlineCategoryForm(false);
    setInlineCategoryForm({ name: "", color: "#3B82F6", description: "" });
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  };

  const handleCreateInlineCategory = async () => {
    const trimmedName = inlineCategoryForm.name.trim();
    if (!trimmedName) return;
    setCreatingCategory(true);
    try {
      const response = await axiosInstance.post(API_PATHS.CATEGORIES.CREATE, {
        name: trimmedName,
        color: inlineCategoryForm.color || "#3B82F6",
        description: inlineCategoryForm.description || "",
      });
      const newCategory = { ...response.data, id: response.data?._id || response.data?.id };
      setCategories((prev) => [newCategory, ...prev]);
      setFormData((prev) => ({ ...prev, category: newCategory.name || trimmedName }));
      setShowInlineCategoryForm(false);
      setInlineCategoryForm({ name: "", color: "#3B82F6", description: "" });
    } catch (err) {
      const fallbackCategory = {
        id: Date.now(),
        name: trimmedName,
        color: inlineCategoryForm.color || "#3B82F6",
        description: inlineCategoryForm.description || "",
      };
      setCategories((prev) => [fallbackCategory, ...prev]);
      localStorage.setItem("categories", JSON.stringify([fallbackCategory, ...categories]));
      setFormData((prev) => ({ ...prev, category: fallbackCategory.name }));
      setShowInlineCategoryForm(false);
      setInlineCategoryForm({ name: "", color: "#3B82F6", description: "" });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await axiosInstance.delete(API_PATHS.ITEMS.DELETE(itemId));
      setItems((prev) => prev.filter((item) => (item.id || item._id) !== itemId));
      window.dispatchEvent(new CustomEvent("itemsUpdated"));
    } catch (err) {
      const updated = items.filter((item) => (item.id || item._id) !== itemId);
      setItems(updated);
      localStorage.setItem("items", JSON.stringify(updated));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedCategory = activeCategories.find((cat) => cat.name === formData.category) || activeCategories.find((cat) => String(cat.id) === String(formData.category));
    const categoryName = selectedCategory?.name || formData.category;
    const categoryColor = selectedCategory?.color || "#3B82F6";
    const normalizedPrice = Number(formData.price || 0);
    const normalizedCost = Number(formData.cost || 0);

    try {
      if (editingItemId) {
        const response = await axiosInstance.put(API_PATHS.ITEMS.UPDATE(editingItemId), {
          name: formData.name,
          description: formData.description,
          category: categoryName,
          categoryColor,
          price: normalizedPrice,
          cost: normalizedCost,
          unit: formData.unit,
          sku: formData.sku,
          image: formData.image || "",
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
          cost: normalizedCost,
          unit: formData.unit,
          sku: formData.sku,
          image: formData.image || "",
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
      window.dispatchEvent(new CustomEvent("itemsUpdated"));
    } catch (err) {
      const selectedCat = activeCategories.find((cat) => String(cat.id) === String(formData.category));
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
                cost: normalizedCost,
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
          cost: normalizedCost,
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
    setUnitMode("preset");
    setCustomUnitDraft("");
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      cost: "",
      unit: "unit",
      sku: "",
      taxRate: "",
      trackStock: false,
      quantityInStock: "",
      reorderLevel: "",
      image: "",
    });
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  };

  const filteredItems = items.filter((item) => {
    const term = (searchTerm || "").toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    const catA = String(a?.category || "").trim();
    const catB = String(b?.category || "").trim();
    const catAIsBend = catA.toLowerCase() === "bend";
    const catBIsBend = catB.toLowerCase() === "bend";
    if (catAIsBend !== catBIsBend) return catAIsBend ? -1 : 1;
    const catCompare = catA.localeCompare(catB, undefined, { sensitivity: "base" });
    if (catCompare !== 0) return catCompare;
    return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" });
  });

  const parsePriceInput = (value) => Number(String(value ?? "").replace(/[^0-9.]/g, "")) || 0;

  const enterBulkEditMode = () => {
    const drafts = {};
    filteredItems.forEach((item) => {
      const itemId = item.id || item._id;
      if (!itemId) return;
      drafts[String(itemId)] = String(parsePriceInput(item.price));
    });
    setBulkPriceDrafts(drafts);
    setBulkEditMode(true);
  };

  const cancelBulkEditMode = () => {
    setBulkEditMode(false);
    setBulkPriceDrafts({});
  };

  const handleBulkSavePrices = async () => {
    const changed = filteredItems.filter((item) => {
      const itemId = String(item.id || item._id || "");
      if (!itemId) return false;
      const current = parsePriceInput(item.price);
      const draft = parsePriceInput(bulkPriceDrafts[itemId]);
      return Math.abs(current - draft) > 0.0001;
    });
    if (changed.length === 0) {
      toast("No price changes to save.");
      return;
    }

    setBulkSaving(true);
    let successCount = 0;
    try {
      for (const item of changed) {
        const itemId = item.id || item._id;
        const itemIdKey = String(itemId);
        const nextPrice = parsePriceInput(bulkPriceDrafts[itemIdKey]);
        const payload = {
          name: item.name || "",
          description: item.description || "",
          category: item.category || "",
          categoryColor: item.categoryColor || "#3B82F6",
          price: nextPrice,
          unit: item.unit || "unit",
          sku: item.sku || "",
          image: item.image || "",
          taxRate: item.taxRate || "",
          cost: Number(item.cost) || 0,
          trackStock: Boolean(item.trackStock),
          quantityInStock: item.trackStock ? Number(item.quantityInStock) || 0 : 0,
          reorderLevel: item.trackStock ? Number(item.reorderLevel) || 0 : 0,
        };
        await axiosInstance.put(API_PATHS.ITEMS.UPDATE(itemId), payload);
        successCount += 1;
      }

      setItems((prev) =>
        prev.map((item) => {
          const itemId = String(item.id || item._id || "");
          if (!itemId || !(itemId in bulkPriceDrafts)) return item;
          const draftPrice = parsePriceInput(bulkPriceDrafts[itemId]);
          const currentPrice = parsePriceInput(item.price);
          if (Math.abs(draftPrice - currentPrice) <= 0.0001) return item;
          return { ...item, price: formatCurrency(draftPrice, userCurrency) };
        })
      );
      toast.success(`Updated ${successCount} item price${successCount > 1 ? "s" : ""}.`);
      cancelBulkEditMode();
      window.dispatchEvent(new CustomEvent("itemsUpdated"));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to bulk update item prices.");
    } finally {
      setBulkSaving(false);
    }
  };

  const productTemplateHeaders = [
    "name",
    "description",
    "category",
    "price",
    "cost",
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
      "65",
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
        window.dispatchEvent(new CustomEvent("itemsUpdated"));
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
          {!bulkEditMode ? (
            <button
              type="button"
              onClick={enterBulkEditMode}
              className="flex items-center space-x-2 px-4 py-3 border border-blue-200 text-blue-900 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Coins className="w-5 h-5" />
              <span>Bulk Edit Prices</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBulkSavePrices}
                disabled={bulkSaving}
                className="flex items-center space-x-2 px-4 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-60"
              >
                <Save className="w-5 h-5" />
                <span>{bulkSaving ? "Saving..." : "Save Price Changes"}</span>
              </button>
              <button
                type="button"
                onClick={cancelBulkEditMode}
                disabled={bulkSaving}
                className="flex items-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </button>
            </>
          )}
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

      {/* Items List */}
      {itemsLoading ? (
        <div className="text-center py-12 text-gray-500">Loading your catalog...</div>
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No items found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <li key={item.id} className="px-3 sm:px-4 py-2.5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">SKU: {item.sku || "-"}</p>
                      <p className="text-[11px] text-gray-500 truncate">{item.description || "No description"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                      style={{ backgroundColor: item.categoryColor || "#3B82F6" }}
                    >
                      {item.category || "Uncategorized"}
                    </span>
                    <span className="text-xs text-gray-600">{item.unit || "unit"}</span>
                    {bulkEditMode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500">{userCurrency}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={bulkPriceDrafts[String(item.id || item._id || "")] ?? String(parsePriceInput(item.price))}
                          onChange={(e) =>
                            setBulkPriceDrafts((prev) => ({
                              ...prev,
                              [String(item.id || item._id || "")]: e.target.value,
                            }))
                          }
                          className="w-24 h-8 px-2 border border-gray-300 rounded-md text-xs"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-gray-900">{item.price}</span>
                    )}
                    <span className="text-[11px] text-blue-900 font-medium">{item.usageCount || 0} invoices</span>
                    <button
                      onClick={() => openEditItem(item)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[82vh] overflow-y-auto shadow-lg">
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product photo (optional)</label>
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                      {formData.image ? (
                        <img src={formData.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-0">
                      <input
                        ref={itemImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-900 file:text-white hover:file:bg-blue-800"
                        onChange={handleItemImageFile}
                      />
                      <p className="text-xs text-gray-500">JPEG, PNG, or WebP. Max 1.5 MB. Shown on Items and POS.</p>
                      {formData.image ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: "" }));
                            if (itemImageInputRef.current) itemImageInputRef.current.value = "";
                          }}
                          className="text-sm text-red-600 hover:underline text-left w-fit"
                        >
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                  </div>
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
                    <option value="">{activeCategories.length > 0 ? "Select Category" : "No active categories"}</option>
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      {activeCategories.length > 0
                        ? "Only active categories are shown."
                        : "No active categories found. Create one below to continue."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowInlineCategoryForm((prev) => !prev)}
                      className="text-xs font-medium text-blue-900 hover:text-blue-800"
                    >
                      {showInlineCategoryForm ? "Hide" : "Create Category"}
                    </button>
                  </div>
                  {showInlineCategoryForm && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <input
                        type="text"
                        value={inlineCategoryForm.name}
                        onChange={(e) => setInlineCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Category name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={inlineCategoryForm.description}
                        onChange={(e) => setInlineCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={inlineCategoryForm.color}
                          onChange={(e) => setInlineCategoryForm((prev) => ({ ...prev, color: e.target.value }))}
                          className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={handleCreateInlineCategory}
                          disabled={creatingCategory || !inlineCategoryForm.name.trim()}
                          className="px-3 py-2 text-xs rounded bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                          {creatingCategory ? "Creating..." : "Save Category"}
                        </button>
                      </div>
                    </div>
                  )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      name="cost"
                      value={formData.cost}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={unitMode === "custom" ? "__custom__" : formData.unit}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        setUnitMode("custom");
                        if (!customUnitDraft) setCustomUnitDraft(formData.unit || "");
                      } else {
                        setUnitMode("preset");
                        setFormData((prev) => ({ ...prev, unit: val }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="__custom__">Create custom unit...</option>
                  </select>
                  {unitMode === "custom" && (
                    <input
                      type="text"
                      value={customUnitDraft}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCustomUnitDraft(v);
                        setFormData((prev) => ({ ...prev, unit: v.trim() || "unit" }));
                      }}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., carton, pack, meter"
                      required
                    />
                  )}
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
