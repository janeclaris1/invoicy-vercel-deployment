import React, { useState, useEffect } from "react";
import { Megaphone, Plus, ImagePlus, X, Trash2, DollarSign } from "lucide-react";

const STORAGE_KEY = "invoicy_social_ads";
const MAX_IMAGE_BYTES = 800 * 1024;

const loadAds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveAds = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const imageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
];

const SocialAdsPage = () => {
  const [ads, setAds] = useState(loadAds);
  const [showForm, setShowForm] = useState(false);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [cta, setCta] = useState("Learn more");
  const [budget, setBudget] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    saveAds(ads);
  }, [ads]);

  const onImageChange = async (e) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image (JPG, PNG).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image too large. Use under ~800KB.");
      return;
    }
    try {
      const dataUrl = await imageToDataUrl(file);
      setImagePreview(dataUrl);
      setImageData(dataUrl);
    } catch (_) {
      setImageError("Could not read image.");
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
    setImageError("");
  };

  const resetForm = () => {
    setHeadline("");
    setDescription("");
    setPlatform("facebook");
    setCta("Learn more");
    setBudget("");
    clearImage();
    setShowForm(false);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!headline.trim()) return;
    setAds((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        headline: headline.trim(),
        description: description.trim(),
        platform,
        cta: cta.trim() || "Learn more",
        budget: budget.trim() || null,
        imageData: imageData || null,
        status: "draft",
        createdAt: new Date().toISOString(),
      },
    ]);
    resetForm();
  };

  const remove = (id) => {
    if (!window.confirm("Delete this ad?")) return;
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const setStatus = (id, status) => {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Create and manage ads for Facebook, Instagram, X, and LinkedIn. (Demo: data is stored locally.)
      </p>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 mb-6"
        >
          <Plus className="w-4 h-4" />
          Create ad
        </button>
      ) : (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            New ad
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headline *</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. 20% off this week"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ad copy or description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600">
                  <ImagePlus className="w-4 h-4" />
                  <span>Upload image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                </label>
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Ad" className="h-24 w-24 object-cover rounded-lg border border-gray-200 dark:border-slate-600" />
                    <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600" aria-label="Remove image">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {imageError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{imageError}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Call-to-action</label>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Learn more"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily budget (demo)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Save ad
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your ads</h2>
      {ads.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No ads yet. Create one above.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {ads.map((ad) => (
            <li
              key={ad.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 flex flex-wrap gap-4 items-start justify-between"
            >
              <div className="flex gap-4 min-w-0 flex-1">
                {ad.imageData && (
                  <img src={ad.imageData} alt="" className="h-20 w-20 object-cover rounded-lg shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{ad.headline}</p>
                  {ad.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{ad.description}</p>}
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{ad.platform}</span>
                    <span>·</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-xs">{ad.status}</span>
                    {ad.budget && <span>· Budget: ${ad.budget}/day</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ad.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => setStatus(ad.id, "active")}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Activate
                  </button>
                )}
                {ad.status === "active" && (
                  <button
                    type="button"
                    onClick={() => setStatus(ad.id, "draft")}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(ad.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                  aria-label="Delete ad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SocialAdsPage;
