import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, FolderOpen, Package } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const Categories = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  const defaultCategories = [
    {
      id: 1,
      name: "Bend",
      description: "Physical products and goods",
      color: "#3B82F6",
      itemCount: 24,
    },
    {
      id: 2,
      name: "Pressure Bend",
      description: "Professional services and consultancy",
      color: "#10B981",
      itemCount: 15,
    },
    {
      id: 3,
      name: "Software",
      description: "Software licenses and subscriptions",
      color: "#8B5CF6",
      itemCount: 8,
    },
    {
      id: 4,
      name: "Hardware",
      description: "Computer hardware and equipment",
      color: "#F59E0B",
      itemCount: 12,
    },
  ];

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.CATEGORIES.GET_ALL);
        const data = Array.isArray(response.data) ? response.data : [];
        setCategories(data.map((c) => ({ ...c, id: c._id || c.id })));
      } catch (err) {
        const saved = localStorage.getItem("categories");
        setCategories(saved ? JSON.parse(saved) : defaultCategories);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
    });
    setShowModal(true);
  };

  const openEditCategory = (category) => {
    setEditingCategoryId(category.id || category._id);
    setFormData({
      name: category.name || "",
      description: category.description || "",
      color: category.color || "#3B82F6",
    });
    setShowModal(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axiosInstance.delete(API_PATHS.CATEGORIES.DELETE(categoryId));
      setCategories((prev) => prev.filter((cat) => (cat.id || cat._id) !== categoryId));
    } catch (err) {
      const updated = categories.filter((cat) => (cat.id || cat._id) !== categoryId);
      setCategories(updated);
      localStorage.setItem("categories", JSON.stringify(updated));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        const response = await axiosInstance.put(API_PATHS.CATEGORIES.UPDATE(editingCategoryId), {
          name: formData.name,
          description: formData.description,
          color: formData.color,
        });
        const updated = response.data;
        setCategories((prev) =>
          prev.map((cat) =>
            (cat.id || cat._id) === editingCategoryId
              ? { ...updated, id: updated._id || updated.id }
              : cat
          )
        );
      } else {
        const response = await axiosInstance.post(API_PATHS.CATEGORIES.CREATE, {
          name: formData.name,
          description: formData.description,
          color: formData.color,
        });
        const newCat = response.data;
        setCategories((prev) => [{ ...newCat, id: newCat._id || newCat.id }, ...prev]);
      }
    } catch (err) {
      if (editingCategoryId) {
        const updated = categories.map((cat) =>
          (cat.id || cat._id) === editingCategoryId
            ? { ...cat, name: formData.name, description: formData.description, color: formData.color }
            : cat
        );
        setCategories(updated);
        localStorage.setItem("categories", JSON.stringify(updated));
      } else {
        const newCategory = {
          id: Date.now(),
          name: formData.name,
          description: formData.description,
          color: formData.color,
          itemCount: 0,
        };
        setCategories((prev) => [newCategory, ...prev]);
        localStorage.setItem("categories", JSON.stringify([newCategory, ...categories]));
      }
    }
    setShowModal(false);
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
    });
  };

  const filteredCategories = categories
    .filter((category) => {
      const term = (searchTerm || "").toLowerCase();
      return (
        (category.name || "").toLowerCase().includes(term) ||
        (category.description || "").toLowerCase().includes(term)
      );
    })
    .slice()
    .sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  const colorOptions = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Red", value: "#EF4444" },
    { name: "Pink", value: "#EC4899" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Teal", value: "#14B8A6" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-sm overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Categories</h1>
              <p className="text-sm text-slate-300 mt-1">
                Organize your items into categories
                {!categoriesLoading ? ` · ${filteredCategories.length} shown` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddCategory}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors shadow-sm self-start"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white/80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {categoriesLoading ? (
            <div className="text-center py-14 text-sm text-slate-500">Loading categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-14 px-4">
              <FolderOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {categories.length === 0 ? "No categories yet" : "No categories match your search"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {categories.length === 0
                  ? "Create a category to organize your catalog."
                  : "Try another name or description."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredCategories.map((category) => {
                const count = Number(category.itemCount) || 0;
                return (
                  <div
                    key={category.id || category._id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border border-slate-100"
                        style={{ backgroundColor: `${category.color || "#3B82F6"}18` }}
                      >
                        <FolderOpen
                          className="h-5 w-5"
                          style={{ color: category.color || "#3B82F6" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-sm font-semibold text-slate-900 leading-snug break-words"
                          title={category.name}
                        >
                          {category.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {count} item{count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditCategory(category)}
                          title="Edit category"
                          aria-label={`Edit ${category.name}`}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category.id || category._id)}
                          title="Delete category"
                          aria-label={`Delete ${category.name}`}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {category.description ? (
                      <p className="mt-3 text-xs text-slate-500 line-clamp-2">
                        {category.description}
                      </p>
                    ) : null}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: category.color || "#3B82F6" }}
                        />
                        <span className="text-[11px] font-medium text-slate-500 truncate">
                          {colorOptions.find((c) => c.value === category.color)?.name || "Custom"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/items?q=${encodeURIComponent(category.name || "")}`)
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-800"
                      >
                        <Package className="w-3.5 h-3.5" />
                        View Items
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCategoryId ? "Edit Category" : "Add New Category"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Categories help group products on invoices and inventory.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Bend, Air Valve"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="grid grid-cols-4 gap-2.5">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2.5 rounded-xl border-2 transition-all ${
                        formData.color === color.value
                          ? "border-slate-900 scale-[1.02]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className="w-full h-7 rounded-lg"
                        style={{ backgroundColor: color.value }}
                      />
                      <p className="text-[10px] font-medium text-slate-600 mt-1.5 text-center">
                        {color.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  {editingCategoryId ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
