import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Loader2, Plus, PhoneCall, Mail as MailIcon, Calendar, FileText, CheckSquare, Briefcase, Building2, UserPlus, Truck } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import toast from "react-hot-toast";

const ACTIVITY_ICONS = { email: MailIcon, call: PhoneCall, meeting: Calendar, note: FileText, task: CheckSquare };
const ACTIVITY_LABELS = { email: "Email", call: "Call", meeting: "Meeting", note: "Note", task: "Task" };
const STAGE_LABELS = { qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };

const DealDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [deal, setDeal] = useState(null);
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

  const fetchDeal = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.DEAL(id));
      setDeal(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Deal not found");
        navigate("/crm/deals", { replace: true });
      } else {
        toast.error(err.response?.data?.message || "Failed to load deal");
      }
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.ACTIVITIES, { params: { dealId: id } });
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setActivities([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchDeal(), fetchActivities()]);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        deal: id,
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

  const getConvertiblePerson = () => {
    if (deal.contact) {
      const c = deal.contact;
      const company = deal.company || c.company;
      return {
        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
        email: c.email || "",
        phone: c.phone || "",
        company: company?.name || "",
        address: company?.address || "",
      };
    }
    if (deal.lead) {
      const l = deal.lead;
      const company = deal.company;
      return {
        name: l.name || "Unknown",
        email: l.email || "",
        phone: l.phone || "",
        company: company?.name || "",
        address: company?.address || "",
      };
    }
    return null;
  };

  const handleConvertToCustomer = () => {
    const person = getConvertiblePerson();
    if (!person) {
      toast.error("No contact or lead linked to this deal");
      return;
    }
    try {
      const saved = localStorage.getItem("customers");
      const existing = saved ? JSON.parse(saved) : [];
      const newCustomer = {
        id: Date.now(),
        name: person.name,
        email: person.email,
        phone: person.phone,
        company: person.company,
        address: person.address,
        city: "",
        country: "",
        taxId: "",
        totalInvoices: 0,
        totalRevenue: formatCurrency(0, userCurrency),
        currency: userCurrency,
      };
      const updated = [newCustomer, ...existing];
      localStorage.setItem("customers", JSON.stringify(updated));
      window.dispatchEvent(new Event("customersUpdated"));
      toast.success(`${person.name} added to Customers. You can select them when creating invoices.`);
    } catch (err) {
      toast.error("Failed to add to customers");
    }
  };

  const handleConvertToSupplier = () => {
    const person = getConvertiblePerson();
    if (!person) {
      toast.error("No contact or lead linked to this deal");
      return;
    }
    try {
      const saved = localStorage.getItem("suppliers");
      const existing = saved ? JSON.parse(saved) : [];
      const newSupplier = {
        id: Date.now(),
        name: person.name,
        email: person.email,
        phone: person.phone,
        company: person.company || person.name,
        address: person.address,
        city: "",
        country: "",
        taxId: "",
        category: "",
      };
      const updated = [newSupplier, ...existing];
      localStorage.setItem("suppliers", JSON.stringify(updated));
      window.dispatchEvent(new Event("suppliersUpdated"));
      toast.success(`${person.name} added to Suppliers. You can select them when creating invoices.`);
    } catch (err) {
      toast.error("Failed to add to suppliers");
    }
  };

  const canConvert = deal?.stage === "won" && (deal?.contact || deal?.lead);
  const person = getConvertiblePerson();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!deal) return null;

  const stageColor = deal.stage === "won" ? "bg-emerald-100 text-emerald-800" : deal.stage === "lost" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700";

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/crm/deals" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to deals
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h2>
            </div>
            <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{deal.name}</h3>
            </div>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${stageColor}`}>
              {STAGE_LABELS[deal.stage] || deal.stage}
            </span>
            <p className="text-lg font-semibold text-gray-900 mt-3">
              {deal.currency} {Number(deal.value).toLocaleString()}
            </p>
            {deal.expectedCloseDate && (
              <p className="text-sm text-gray-500 mt-1">Expected close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</p>
            )}
            {(deal.contact || deal.lead) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Customer / Lead</p>
                {deal.contact && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{deal.contact.firstName} {deal.contact.lastName}</span>
                    {deal.contact.email && <a href={`mailto:${deal.contact.email}`} className="text-blue-600 hover:underline">{deal.contact.email}</a>}
                  </div>
                )}
                {deal.lead && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                    <span className="text-gray-500">Lead:</span>
                    <span>{deal.lead.name}</span>
                    {deal.lead.email && <a href={`mailto:${deal.lead.email}`} className="text-blue-600 hover:underline">{deal.lead.email}</a>}
                  </div>
                )}
              </div>
            )}
            {deal.company?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span>{deal.company.name}</span>
              </div>
            )}
            {canConvert && person && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Convert to billing</p>
                <p className="text-sm text-gray-600 mb-2">Add this contact to Customers or Suppliers so you can select them when creating invoices.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleConvertToCustomer}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Convert to Customer
                  </button>
                  <button
                    type="button"
                    onClick={handleConvertToSupplier}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <Truck className="w-4 h-4" />
                    Convert to Supplier
                  </button>
                </div>
              </div>
            )}
            {deal.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{deal.notes}</p>
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
              {activities.length > 0 && (
                <div
                  className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-300"
                  aria-hidden
                />
              )}
              {activities.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No activities yet. Log a call, email, meeting, or note to build the timeline.
                </div>
              ) : (
                activities.map((a, index) => {
                  const Icon = ACTIVITY_ICONS[a.type] || FileText;
                  const isMeeting = a.type === "meeting";
                  return (
                    <div key={a._id} className="relative flex gap-4 pl-12 py-4">
                      <div className="absolute left-0 w-10 flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center flex-shrink-0 z-10 text-white text-sm font-semibold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pl-2">
                        <p className="text-sm font-medium text-gray-900">{a.title || ACTIVITY_LABELS[a.type] || a.type}</p>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Add</button>
                <button type="button" onClick={() => setActivityModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealDetailPage;
