import React, { useState, useEffect } from "react";
import { Calendar, Plus, Clock, ImagePlus, X } from "lucide-react";

const STORAGE_KEY = "invoicy_social_scheduled";
const MAX_IMAGE_BYTES = 800 * 1024; // ~800KB to avoid blowing localStorage

const loadScheduled = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveScheduled = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const imageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SocialSchedulePage = () => {
  const [scheduled, setScheduled] = useState(loadScheduled);
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    saveScheduled(scheduled);
  }, [scheduled]);

  const onImageChange = async (e) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file (e.g. JPG, PNG).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image too large. Use a smaller image (under ~800KB).");
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && !imageData) return;
    const at = date && time ? new Date(`${date}T${time}`).toISOString() : null;
    setScheduled((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: content.trim(),
        platform,
        scheduledAt: at,
        status: "scheduled",
        imageData: imageData || null,
      },
    ]);
    setContent("");
    setDate("");
    setTime("09:00");
    clearImage();
  };

  const remove = (id) => {
    setScheduled((prev) => prev.filter((p) => p.id !== id));
  };

  const platforms = [
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "twitter", label: "X (Twitter)" },
    { value: "linkedin", label: "LinkedIn" },
  ];

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Schedule a post
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="What would you like to post?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Picture</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600">
                <ImagePlus className="w-4 h-4" />
                <span>Add image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onImageChange}
                />
              </label>
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Post" className="h-24 w-24 object-cover rounded-lg border border-gray-200 dark:border-slate-600" />
                  <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600" aria-label="Remove image">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {imageError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{imageError}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional. Max ~800KB (JPG, PNG).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!content.trim() && !imageData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4" />
            Add to schedule
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Scheduled posts
        </h2>
        {scheduled.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-6">No scheduled posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {scheduled.map((p) => (
              <li
                key={p.id}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-start gap-4"
              >
                <div className="min-w-0 flex-1 flex gap-4">
                  {p.imageData && (
                    <img src={p.imageData} alt="Post" className="h-20 w-20 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium capitalize">{p.platform}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">{p.content || "(Image only)"}</p>
                    {p.scheduledAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(p.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SocialSchedulePage;
