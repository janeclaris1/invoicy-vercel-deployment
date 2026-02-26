import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, FileText, Loader2, ArrowLeft } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

/**
 * HubSpot-style: Marketing > Campaigns > Templates > Select
 * Choose a template to start a campaign, or start from scratch.
 */
const CampaignTemplateSelectPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(API_PATHS.MARKETING.TEMPLATES);
        setTemplates(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load templates");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const createCampaignAndGoToEditor = async (templateId = null, name = "Untitled campaign", subject = "", body = "") => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await axiosInstance.post(API_PATHS.MARKETING.CAMPAIGNS, {
        name,
        type: "email",
        subject,
        body,
        targetSegment: "all",
        listId: null,
        templateId,
        scheduledAt: null,
      });
      const id = res.data?._id;
      if (id) navigate(`/marketing/campaigns/${id}/editor`, { replace: true });
      else toast.error("Campaign created but could not open editor");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleUseTemplate = (t) => {
    createCampaignAndGoToEditor(t._id, t.name || "Untitled campaign", t.subject || "", t.body || "");
  };

  const handleStartFromScratch = () => {
    createCampaignAndGoToEditor(null, "Untitled campaign", "", "");
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
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/marketing/campaigns"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to campaigns
        </Link>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Choose a template</h2>
      <p className="text-gray-500 text-sm mb-8">
        Start from an email template or create a campaign from scratch (HubSpot-style flow).
      </p>

      {/* Start from scratch - HubSpot allows this */}
      <div className="mb-8">
        <button
          type="button"
          onClick={handleStartFromScratch}
          disabled={creating}
          className="flex items-center gap-4 w-full max-w-md p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-7 h-7 text-gray-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Start from scratch</h3>
            <p className="text-sm text-gray-500">Create a new email campaign with a blank template</p>
          </div>
          {creating && <Loader2 className="w-5 h-5 animate-spin text-blue-600 ml-auto" />}
        </button>
      </div>

      {/* Saved templates */}
      <h3 className="text-sm font-medium text-gray-700 mb-4">Your email templates</h3>
      {templates.length === 0 ? (
        <p className="text-gray-500 text-sm">No templates yet. Create templates under Marketing → Email templates, or start from scratch above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => handleUseTemplate(t)}
              disabled={creating}
              className="flex flex-col p-5 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 truncate">{t.name}</h4>
              {t.subject && <p className="text-xs text-gray-500 truncate mt-1">{t.subject}</p>}
              <span className="mt-3 text-sm font-medium text-blue-600 group-hover:underline">Use template</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignTemplateSelectPage;
