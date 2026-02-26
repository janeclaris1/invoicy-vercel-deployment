import React, { useState, useEffect } from "react";
import { BarChart3, Mail, FileInput, Layout, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(API_PATHS.MARKETING.ANALYTICS);
        setData(res.data);
      } catch {
        setData({ overview: { campaignsSent: 0, formSubmissions: 0, publishedLandingPages: 0 }, recentCampaigns: [], recentSubmissions: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const overview = data?.overview || { campaignsSent: 0, formSubmissions: 0, publishedLandingPages: 0 };
  const recentCampaigns = data?.recentCampaigns || [];
  const recentSubmissions = data?.recentSubmissions || [];

  return (
    <div>
      <p className="text-gray-500 text-sm mb-6">HubSpot-style marketing overview: campaigns, forms, and landing pages.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overview.campaignsSent}</p>
            <p className="text-sm text-gray-500">Campaigns sent</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
            <FileInput className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overview.formSubmissions}</p>
            <p className="text-sm text-gray-500">Form submissions</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
            <Layout className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overview.publishedLandingPages}</p>
            <p className="text-sm text-gray-500">Published landing pages</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Recent campaigns</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {recentCampaigns.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No campaigns yet.</p>
            ) : (
              recentCampaigns.map((c) => (
                <div key={c._id} className="px-4 py-3 flex justify-between items-center">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className="text-xs text-gray-500">
                    {c.status} {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <FileInput className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Recent form submissions</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {recentSubmissions.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No submissions yet.</p>
            ) : (
              recentSubmissions.map((s) => (
                <div key={s._id} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{s.formName || "Form"}</p>
                  <p className="text-xs text-gray-500">
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ""}
                  </p>
                  {s.data && Object.keys(s.data).length > 0 && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {Object.entries(s.data)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
