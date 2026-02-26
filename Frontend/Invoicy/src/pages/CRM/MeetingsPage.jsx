import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Loader2, MapPin, Clock, Eye } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const MeetingsPage = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMeeting, setViewMeeting] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    endDate: "",
    location: "",
    contact: "",
    lead: "",
    deal: "",
  });

  const fetchMeetings = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.ACTIVITIES);
      const all = Array.isArray(res.data) ? res.data : [];
      const meetingList = all.filter((a) => a.type === "meeting").sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
      setMeetings(meetingList);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [cRes, lRes, dRes] = await Promise.all([
        axiosInstance.get(API_PATHS.CRM.CONTACTS),
        axiosInstance.get(API_PATHS.CRM.LEADS),
        axiosInstance.get(API_PATHS.CRM.DEALS),
      ]);
      setContacts(Array.isArray(cRes.data) ? cRes.data : []);
      setLeads(Array.isArray(lRes.data) ? lRes.data : []);
      setDeals(Array.isArray(dRes.data) ? dRes.data : []);
    } catch (_) {
      setContacts([]);
      setLeads([]);
      setDeals([]);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (modalOpen) fetchOptions();
  }, [modalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await axiosInstance.post(API_PATHS.CRM.ACTIVITIES, {
        type: "meeting",
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        location: form.location.trim() || null,
        contact: form.contact || null,
        lead: form.lead || null,
        deal: form.deal || null,
      });
      toast.success("Meeting added");
      setModalOpen(false);
      setForm({ title: "", description: "", dueDate: "", endDate: "", location: "", contact: "", lead: "", deal: "" });
      fetchMeetings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add meeting");
    }
  };

  const now = new Date();
  const upcoming = meetings.filter((m) => m.dueDate && new Date(m.dueDate) >= now);
  const past = meetings.filter((m) => !m.dueDate || new Date(m.dueDate) < now);
  const timelineMeetings = [...meetings].sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

  const getRelated = (m) => {
    if (m.contact?.firstName) return `Contact: ${m.contact.firstName} ${m.contact.lastName}`;
    if (m.lead?.name) return `Lead: ${m.lead.name}`;
    if (m.deal?.name) return `Deal: ${m.deal.name}`;
    return null;
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
        <p className="text-gray-500 text-sm">Schedule and view meetings linked to contacts, leads, and deals.</p>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Schedule meeting
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Timeline</h2>
        </div>
        <div className="relative py-2">
          {timelineMeetings.length > 0 && (
            <div
              className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-300"
              aria-hidden
            />
          )}
          {timelineMeetings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No meetings yet. Schedule a meeting to get started.</p>
            </div>
          ) : (
            timelineMeetings.map((m, index) => {
              const isPast = !m.dueDate || new Date(m.dueDate) < now;
              return (
                <div key={m._id} className="relative flex gap-4 pl-12 py-4">
                  <div className="absolute left-0 w-10 flex justify-center">
                    <div className={`w-8 h-8 rounded-full border-2 border-white shadow flex items-center justify-center flex-shrink-0 z-10 text-white text-sm font-semibold ${isPast ? "bg-gray-400" : "bg-blue-500"}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pl-2">
                    <p className="font-medium text-gray-900">{m.title || "Meeting"}</p>
                    {getRelated(m) && <p className="text-sm text-gray-500">{getRelated(m)}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {m.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(m.dueDate).toLocaleString()}
                        </span>
                      )}
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {m.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setViewMeeting(m)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View details
                      </button>
                      {m.contact && (
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/contacts/${m.contact._id || m.contact}`)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View contact
                        </button>
                      )}
                      {m.lead && (
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/leads/${m.lead._id || m.lead}`)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View lead
                        </button>
                      )}
                      {m.deal && (
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/deals/${m.deal._id || m.deal}`)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View deal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {viewMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewMeeting(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{viewMeeting.title || "Meeting"}</h2>
            <dl className="space-y-2 text-sm">
              {viewMeeting.dueDate && (
                <>
                  <dt className="text-gray-500">Start</dt>
                  <dd className="text-gray-900">{new Date(viewMeeting.dueDate).toLocaleString()}</dd>
                </>
              )}
              {viewMeeting.endDate && (
                <>
                  <dt className="text-gray-500">End</dt>
                  <dd className="text-gray-900">{new Date(viewMeeting.endDate).toLocaleString()}</dd>
                </>
              )}
              {viewMeeting.location && (
                <>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="text-gray-900">{viewMeeting.location}</dd>
                </>
              )}
              {viewMeeting.description && (
                <>
                  <dt className="text-gray-500">Description</dt>
                  <dd className="text-gray-700 whitespace-pre-wrap">{viewMeeting.description}</dd>
                </>
              )}
              {(viewMeeting.contact || viewMeeting.lead || viewMeeting.deal) && (
                <>
                  <dt className="text-gray-500">Linked to</dt>
                  <dd className="flex flex-wrap gap-2">
                    {viewMeeting.contact && (
                      <button
                        type="button"
                        onClick={() => { navigate(`/crm/contacts/${viewMeeting.contact._id || viewMeeting.contact}`); setViewMeeting(null); }}
                        className="text-blue-600 hover:underline"
                      >
                        Contact: {viewMeeting.contact.firstName ? `${viewMeeting.contact.firstName} ${viewMeeting.contact.lastName}` : "View"}
                      </button>
                    )}
                    {viewMeeting.lead && (
                      <button
                        type="button"
                        onClick={() => { navigate(`/crm/leads/${viewMeeting.lead._id || viewMeeting.lead}`); setViewMeeting(null); }}
                        className="text-blue-600 hover:underline"
                      >
                        Lead: {viewMeeting.lead.name || "View"}
                      </button>
                    )}
                    {viewMeeting.deal && (
                      <button
                        type="button"
                        onClick={() => { navigate(`/crm/deals/${viewMeeting.deal._id || viewMeeting.deal}`); setViewMeeting(null); }}
                        className="text-blue-600 hover:underline"
                      >
                        Deal: {viewMeeting.deal.name || "View"}
                      </button>
                    )}
                  </dd>
                </>
              )}
            </dl>
            <div className="mt-6">
              <button type="button" onClick={() => setViewMeeting(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Schedule meeting</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Discovery call"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Address or video link"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to contact</label>
                <select
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value || "" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to lead</label>
                <select
                  value={form.lead}
                  onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value || "" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— None —</option>
                  {leads.map((l) => (
                    <option key={l._id} value={l._id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to deal</label>
                <select
                  value={form.deal}
                  onChange={(e) => setForm((f) => ({ ...f, deal: e.target.value || "" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— None —</option>
                  {deals.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[80px]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Add meeting</button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;
