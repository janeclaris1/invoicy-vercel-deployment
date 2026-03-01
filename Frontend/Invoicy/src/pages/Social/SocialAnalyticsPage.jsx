import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Eye, Heart, MessageCircle } from "lucide-react";

const STORAGE_KEY_ACCOUNTS = "invoicy_social_accounts";
const STORAGE_KEY_SCHEDULED = "invoicy_social_scheduled";

const SocialAnalyticsPage = () => {
  const [connectedCount, setConnectedCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    try {
      const accRaw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      const acc = accRaw ? JSON.parse(accRaw) : [];
      setConnectedCount(acc.filter((a) => a.connected).length);
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SCHEDULED);
      const list = raw ? JSON.parse(raw) : [];
      setPostCount(list.length);
    } catch (_) {}
  }, []);

  const stats = [
    { label: "Connected accounts", value: connectedCount, icon: BarChart3, color: "text-blue-600" },
    { label: "Scheduled posts", value: postCount, icon: TrendingUp, color: "text-green-600" },
    { label: "Impressions (demo)", value: "—", icon: Eye, color: "text-purple-600" },
    { label: "Engagement (demo)", value: "—", icon: Heart, color: "text-pink-600" },
    { label: "Comments (demo)", value: "—", icon: MessageCircle, color: "text-amber-600" },
  ];

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Overview of your social media performance. Connect accounts and schedule posts to see more data here.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5"
          >
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 p-6 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Coming soon</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Charts for impressions, engagement, and reach per platform will appear here once you connect accounts and publish posts.
        </p>
      </div>
    </div>
  );
};

export default SocialAnalyticsPage;
