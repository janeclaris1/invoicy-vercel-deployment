import React, { useState, useEffect } from "react";
import { BarChart3, Users, Target, Briefcase, Mail, PhoneCall, Calendar, FileText, CheckSquare, Loader2, TrendingUp } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const STAGE_LABELS = { qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const STATUS_LABELS = { new: "New", contacted: "Contacted", qualified: "Qualified", converted: "Converted", lost: "Lost" };
const ACTIVITY_LABELS = { email: "Emails", call: "Calls", meeting: "Meetings", note: "Notes", task: "Tasks" };

const CRMReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(API_PATHS.CRM.REPORTS);
        setData(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load reports");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        Unable to load CRM reports. Try again later.
      </div>
    );
  }

  const { summary, pipeline, leadsByStatus, activitiesByType, upcomingMeetings } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Contacts
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary?.totalContacts ?? 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Target className="w-4 h-4" />
              Leads
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary?.totalLeads ?? 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Pipeline value
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary?.totalPipelineValue != null ? Number(summary.totalPipelineValue).toLocaleString() : "0"}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Briefcase className="w-4 h-4" />
              Won value
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {summary?.wonValue != null ? Number(summary.wonValue).toLocaleString() : "0"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Pipeline by stage</h3>
          </div>
          <div className="p-6">
            {Array.isArray(pipeline) && pipeline.length > 0 ? (
              <ul className="space-y-3">
                {pipeline.map((p) => (
                  <li key={p.stage} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{STAGE_LABELS[p.stage] || p.stage}</span>
                    <span className="text-sm text-gray-600">
                      {p.count} deal{p.count !== 1 ? "s" : ""} · {p.currency} {Number(p.value).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No deals yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Leads by status</h3>
          </div>
          <div className="p-6">
            {leadsByStatus && Object.keys(leadsByStatus).length > 0 ? (
              <ul className="space-y-3">
                {Object.entries(leadsByStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[status] || status}</span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No leads yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Activities by type</h3>
          </div>
          <div className="p-6">
            {activitiesByType && Object.keys(activitiesByType).length > 0 ? (
              <ul className="space-y-3">
                {Object.entries(activitiesByType).map(([type, count]) => (
                  <li key={type} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {type === "email" && <Mail className="w-4 h-4" />}
                      {type === "call" && <PhoneCall className="w-4 h-4" />}
                      {type === "meeting" && <Calendar className="w-4 h-4" />}
                      {type === "note" && <FileText className="w-4 h-4" />}
                      {type === "task" && <CheckSquare className="w-4 h-4" />}
                      {ACTIVITY_LABELS[type] || type}
                    </span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No activities yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Upcoming meetings</h3>
          </div>
          <div className="p-6">
            {Array.isArray(upcomingMeetings) && upcomingMeetings.length > 0 ? (
              <ul className="space-y-3">
                {upcomingMeetings.slice(0, 10).map((m) => (
                  <li key={m._id} className="text-sm">
                    <p className="font-medium text-gray-900">{m.title || "Meeting"}</p>
                    <p className="text-gray-500">
                      {m.dueDate ? new Date(m.dueDate).toLocaleString() : ""}
                      {m.location ? ` · ${m.location}` : ""}
                    </p>
                  </li>
                ))}
                {upcomingMeetings.length > 10 && (
                  <li className="text-xs text-gray-500">+{upcomingMeetings.length - 10} more</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No upcoming meetings.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMReportsPage;
