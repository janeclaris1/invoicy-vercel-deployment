import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building2, Loader2, Plus, PhoneCall, Mail as MailIcon, Calendar, FileText, CheckSquare } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const ACTIVITY_ICONS = { email: MailIcon, call: PhoneCall, meeting: Calendar, note: FileText, task: CheckSquare };
const ACTIVITY_LABELS = { email: "Email", call: "Call", meeting: "Meeting", note: "Note", task: "Task" };

const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "note",
    title: "",
    description: "",
    dueDate: "",
    endDate: "",
    location: "",
  });

  const fetchContact = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.CONTACT(id));
      setContact(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Contact not found");
        navigate("/crm/contacts", { replace: true });
      } else {
        toast.error(err.response?.data?.message || "Failed to load contact");
      }
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.ACTIVITIES, { params: { contactId: id } });
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setActivities([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchContact(), fetchActivities()]);
      setLoading(false);
    };
    load();
  }, [id]);

  const fullName = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : "—");

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        contact: id,
        type: activityForm.type,
        title: activityForm.title.trim(),
        description: activityForm.description.trim(),
      };
      if (activityForm.type === "meeting") {
        payload.dueDate = activityForm.dueDate ? new Date(activityForm.dueDate).toISOString() : null;
        payload.endDate = activityForm.endDate ? new Date(activityForm.endDate).toISOString() : null;
        payload.location = activityForm.location.trim() || null;
      }
      await axiosInstance.post(API_PATHS.CRM.ACTIVITIES, payload);
      toast.success("Activity added");
      setActivityModalOpen(false);
      setActivityForm({ type: "note", title: "", description: "", dueDate: "", endDate: "", location: "" });
      fetchActivities();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add activity");
    }
  };

  const notesOnly = activities.filter((a) => a.type === "note");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/crm/contacts" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to contacts
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h2>
            </div>
            <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{fullName(contact)}</h3>
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
              </div>
            )}
            {contact.company?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span>{contact.company.name}</span>
              </div>
            )}
            {contact.jobTitle && <p className="text-sm text-gray-500 mt-2">{contact.jobTitle}</p>}
            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Profile notes</p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
            {notesOnly.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Timeline notes ({notesOnly.length})</p>
                <ul className="space-y-2">
                  {notesOnly.slice(0, 5).map((a) => (
                    <li key={a._id} className="text-sm text-gray-700 border-l-2 border-gray-200 pl-2">
                      {a.title || "Note"} — {new Date(a.createdAt).toLocaleDateString()}
                    </li>
                  ))}
                  {notesOnly.length > 5 && <li className="text-xs text-gray-500">+{notesOnly.length - 5} more</li>}
                </ul>
              </div>
            )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Timeline</h2>
              <button
                type="button"
                onClick={() => setActivityModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Log activity
              </button>
            </div>
            <div className="relative py-2">
              {/* Vertical line */}
              {activities.length > 0 && (
                <div
                  className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-300"
                  aria-hidden
                />
              )}
              {activities.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No activities yet. Log a call, email, meeting, or note to build this contact’s timeline.
                </div>
              ) : (
                activities.map((a, index) => {
                  const Icon = ACTIVITY_ICONS[a.type] || FileText;
                  const isMeeting = a.type === "meeting";
                  return (
                    <div key={a._id} className="relative flex gap-4 pl-12 py-4">
                      {/* Node on the line */}
                      <div className="absolute left-0 w-10 flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center flex-shrink-0 z-10 text-white text-sm font-semibold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pl-2">
                        <p className="text-sm font-medium text-gray-900">
                          {a.title || ACTIVITY_LABELS[a.type] || a.type}
                        </p>
                        {isMeeting && (a.dueDate || a.location) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {a.dueDate && new Date(a.dueDate).toLocaleString()}
                            {a.location && ` · ${a.location}`}
                          </p>
                        )}
                        {a.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.description}</p>}
                        <p className="text-xs text-gray-400 mt-2">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {activityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Log activity</h2>
            </div>
            <form onSubmit={handleAddActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Follow-up call"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={activityForm.description}
                  onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[80px]"
                  placeholder="Details..."
                />
              </div>
              {activityForm.type === "meeting" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                      <input
                        type="datetime-local"
                        value={activityForm.dueDate}
                        onChange={(e) => setActivityForm((f) => ({ ...f, dueDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                      <input
                        type="datetime-local"
                        value={activityForm.endDate}
                        onChange={(e) => setActivityForm((f) => ({ ...f, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={activityForm.location}
                      onChange={(e) => setActivityForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Address or video link"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  Add
                </button>
                <button type="button" onClick={() => setActivityModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactDetailPage;
