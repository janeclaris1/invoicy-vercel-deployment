import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, FolderOpen } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const Categories = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  // Sample category data
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

  const filteredCategories = categories.filter((category) => {
    const term = (searchTerm || "").toLowerCase();
    return (
      (category.name || "").toLowerCase().includes(term) ||
      (category.description || "").toLowerCase().includes(term)
    );
  });

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Categories</h1>
          <p className="text-gray-600 dark:text-white">Organize your items into categories</p>
        </div>
        <button
          onClick={openAddCategory}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories Grid */}
      {categoriesLoading ? (
        <div className="text-center py-12 text-gray-500">Loading categories...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <FolderOpen className="w-6 h-6" style={{ color: category.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.itemCount} items</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openEditCategory(category)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{category.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-xs text-gray-500">Color</span>
              </div>
              <button className="text-sm text-blue-900 hover:text-blue-800 font-medium">
                View Items
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingCategoryId ? "Edit Category" : "Add New Category"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Products, Services"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Describe this category..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? "border-gray-900 scale-105"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded"
                        style={{ backgroundColor: color.value }}
                      ></div>
                      <p className="text-xs text-gray-600 mt-1 text-center">{color.name}</p>
                    </button>
                  ))}
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
