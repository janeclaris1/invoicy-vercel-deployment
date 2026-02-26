import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

/**
 * HubSpot-style: Marketing > Campaigns > [Campaign] > Editor
 * Full-page campaign editor (like HubSpot's campaign editor).
 */
const CampaignEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "email",
    subject: "",
    body: "",
    targetSegment: "all",
    listId: "",
    scheduledAt: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!id) {
        navigate("/marketing/campaigns", { replace: true });
        return;
      }
      try {
        setLoading(true);
        const [campRes, listRes] = await Promise.all([
          axiosInstance.get(API_PATHS.MARKETING.CAMPAIGN(id)),
          axiosInstance.get(API_PATHS.MARKETING.LISTS),
        ]);
        const c = campRes.data;
        setCampaign(c);
        setForm({
          name: c.name || "",
          type: c.type || "email",
          subject: c.subject || "",
          body: c.body || "",
          targetSegment: c.targetSegment || "all",
          listId: c.listId || "",
          scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : "",
        });
        setLists(Array.isArray(listRes.data) ? listRes.data : []);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error("Campaign not found");
          navigate("/marketing/campaigns", { replace: true });
        } else {
          toast.error(err.response?.data?.message || "Failed to load campaign");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put(API_PATHS.MARKETING.CAMPAIGN(id), {
        name: form.name.trim(),
        type: form.type,
        subject: form.subject,
        body: form.body,
        targetSegment: form.targetSegment,
        listId: form.listId || null,
        scheduledAt: form.scheduledAt || null,
      });
      toast.success("Campaign saved");
      setCampaign((prev) => (prev ? { ...prev, ...form } : prev));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/marketing/campaigns"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to campaigns
          </Link>
          <span className="text-gray-400">|</span>
          <h1 className="text-xl font-bold text-gray-900">Campaign editor</h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-white border border-gray-200 rounded-xl p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="e.g. Welcome series"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="email">Email</option>
            <option value="promo">Promo</option>
            <option value="ad">Ad</option>
          </select>
        </div>
        {form.type === "email" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target list</label>
              <select
                value={form.listId}
                onChange={(e) => setForm((f) => ({ ...f, listId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All contacts</option>
                {lists.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[200px]"
                placeholder="Email content"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target segment</label>
          <select
            value={form.targetSegment}
            onChange={(e) => setForm((f) => ({ ...f, targetSegment: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All contacts</option>
            <option value="customers">Customers only</option>
            <option value="leads">Leads only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (optional)</label>
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </form>
    </div>
  );
};

export default CampaignEditorPage;
