import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Mail, Megaphone, Loader2, Edit2, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const TYPE_LABELS = { email: "Email", promo: "Promo", ad: "Ad" };
const STATUS_LABELS = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", sent: "Sent", cancelled: "Cancelled" };

const CampaignsPage = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.MARKETING.CAMPAIGNS);
      setCampaigns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const goToCreate = () => navigate("/marketing/campaigns/templates/select");
  const goToEditor = (c) => navigate(`/marketing/campaigns/${c._id}/editor`);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this campaign?")) return;
    try {
      await axiosInstance.delete(API_PATHS.MARKETING.CAMPAIGN(id));
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Create and manage email and promo campaigns.</p>
        <button
          onClick={goToCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New campaign
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No campaigns yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Scheduled</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => goToEditor(c)}
                      className="text-left font-medium text-gray-900 hover:text-blue-600 focus:outline-none"
                    >
                      {c.name}
                    </button>
                    {c.subject && <p className="text-xs text-gray-500 truncate max-w-xs">{c.subject}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{TYPE_LABELS[c.type] || c.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === "sent" ? "bg-emerald-100 text-emerald-800" :
                        c.status === "scheduled" ? "bg-amber-100 text-amber-800" :
                        c.status === "draft" ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => goToEditor(c)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c._id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
