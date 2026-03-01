import React, { useState, useEffect } from "react";
import { FileText, Calendar, Trash2 } from "lucide-react";

const STORAGE_KEY_SCHEDULED = "invoicy_social_scheduled";

const SocialPostsPage = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SCHEDULED);
      const list = raw ? JSON.parse(raw) : [];
      setPosts(list);
    } catch (_) {
      setPosts([]);
    }
  }, []);

  const remove = (id) => {
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEY_SCHEDULED, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        All your scheduled and published posts in one place.
      </p>
      {posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No posts yet. Schedule one from the Schedule tab.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li
              key={p.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 flex justify-between items-start gap-4"
            >
              <div className="min-w-0 flex-1 flex gap-4">
                {p.imageData && (
                  <img src={p.imageData} alt="Post" className="h-20 w-20 object-cover rounded-lg shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="capitalize font-medium text-gray-700 dark:text-gray-300">{p.platform}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : "No date"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                      {p.status || "scheduled"}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white break-words">{p.content || (p.imageData ? "(Image only)" : "")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                aria-label="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SocialPostsPage;
