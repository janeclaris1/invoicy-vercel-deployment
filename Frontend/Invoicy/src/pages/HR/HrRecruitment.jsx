import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, Briefcase, User, Calendar, Mail } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";

const JOB_EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Volunteer"];
const JOB_STATUSES = ["Draft", "Open", "Closed"];
const APPLICATION_STATUSES = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];

const HrRecruitment = () => {
  const [activeTab, setActiveTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJobId, setFilterJobId] = useState("");
  const [filterJobStatus, setFilterJobStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "",
    location: "",
    employmentType: "Full-time",
    description: "",
    requirements: "",
    status: "Draft",
  });
  const [applicationForm, setApplicationForm] = useState({
    jobId: "",
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    resumeUrl: "",
    resumeNotes: "",
    source: "",
    status: "Applied",
    notes: "",
    appliedAt: moment().format("YYYY-MM-DD"),
  });

  const fetchJobs = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HR_RECRUITMENT.JOBS);
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load jobs");
      setJobs([]);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HR_RECRUITMENT.APPLICATIONS);
      setApplications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load applications");
      setApplications([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchApplications()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetJobForm = () => {
    setJobForm({
      title: "",
      department: "",
      location: "",
      employmentType: "Full-time",
      description: "",
      requirements: "",
      status: "Draft",
    });
    setEditingItem(null);
  };

  const resetApplicationForm = () => {
    setApplicationForm({
      jobId: filterJobId || (jobs[0]?._id || ""),
      candidateName: "",
      candidateEmail: "",
      candidatePhone: "",
      resumeUrl: "",
      resumeNotes: "",
      source: "",
      status: "Applied",
      notes: "",
      appliedAt: moment().format("YYYY-MM-DD"),
    });
    setEditingItem(null);
  };

  const openAddJob = () => {
    resetJobForm();
    setShowModal(true);
  };

  const openAddApplication = () => {
    resetApplicationForm();
    setApplicationForm((prev) => ({ ...prev, jobId: filterJobId || jobs[0]?._id || "" }));
    setShowModal(true);
  };

  const openEditJob = (job) => {
    setEditingItem(job);
    setJobForm({
      title: job.title || "",
      department: job.department || "",
      location: job.location || "",
      employmentType: job.employmentType || "Full-time",
      description: job.description || "",
      requirements: job.requirements || "",
      status: job.status || "Draft",
    });
    setShowModal(true);
  };

  const openEditApplication = (app) => {
    setEditingItem(app);
    setApplicationForm({
      jobId: app.job?._id || app.job,
      candidateName: app.candidateName || "",
      candidateEmail: app.candidateEmail || "",
      candidatePhone: app.candidatePhone || "",
      resumeUrl: app.resumeUrl || "",
      resumeNotes: app.resumeNotes || "",
      source: app.source || "",
      status: app.status || "Applied",
      notes: app.notes || "",
      appliedAt: app.appliedAt ? moment(app.appliedAt).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
    });
    setShowModal(true);
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axiosInstance.put(API_PATHS.HR_RECRUITMENT.JOBS_BY_ID(editingItem._id), jobForm);
        toast.success("Job updated");
      } else {
        await axiosInstance.post(API_PATHS.HR_RECRUITMENT.JOBS, jobForm);
        toast.success("Job created");
      }
      setShowModal(false);
      resetJobForm();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save job");
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        jobId: applicationForm.jobId,
        candidateName: applicationForm.candidateName,
        candidateEmail: applicationForm.candidateEmail,
        candidatePhone: applicationForm.candidatePhone,
        resumeUrl: applicationForm.resumeUrl,
        resumeNotes: applicationForm.resumeNotes,
        source: applicationForm.source,
        status: applicationForm.status,
        notes: applicationForm.notes,
        appliedAt: applicationForm.appliedAt,
      };
      if (editingItem) {
        await axiosInstance.put(API_PATHS.HR_RECRUITMENT.APPLICATIONS_BY_ID(editingItem._id), payload);
        toast.success("Application updated");
      } else {
        await axiosInstance.post(API_PATHS.HR_RECRUITMENT.APPLICATIONS, payload);
        toast.success("Application added");
      }
      setShowModal(false);
      resetApplicationForm();
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save application");
    }
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm("Delete this job? All applications for this job will also be deleted.")) return;
    try {
      await axiosInstance.delete(API_PATHS.HR_RECRUITMENT.JOBS_BY_ID(job._id));
      toast.success("Job deleted");
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleDeleteApplication = async (app) => {
    if (!window.confirm("Delete this application?")) return;
    try {
      await axiosInstance.delete(API_PATHS.HR_RECRUITMENT.APPLICATIONS_BY_ID(app._id));
      toast.success("Application deleted");
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const openJobs = jobs.filter((j) => j.status === "Open");
  const filteredJobs = jobs.filter((j) => {
    const matchSearch = !searchTerm || (j.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || (j.department || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterJobStatus || j.status === filterJobStatus;
    return matchSearch && matchStatus;
  });

  const filteredApplications = applications.filter((a) => {
    const name = (a.candidateName || "").toLowerCase();
    const email = (a.candidateEmail || "").toLowerCase();
    const jobTitle = (a.job?.title || "").toLowerCase();
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase()) || jobTitle.includes(searchTerm.toLowerCase());
    const matchJob = !filterJobId || (a.job?._id || a.job) === filterJobId;
    return matchSearch && matchJob;
  });

  const jobStatusColor = (status) => {
    switch (status) {
      case "Open": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Closed": return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
      default: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    }
  };

  const applicationStatusColor = (status) => {
    switch (status) {
      case "Hired": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Offer": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Interview": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "Rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "Screening": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Recruitment & ATS</h1>
          <p className="text-gray-600 dark:text-slate-400">Manage job postings and applicant tracking.</p>
        </div>
        <button
          onClick={activeTab === "jobs" ? openAddJob : openAddApplication}
          className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shrink-0 border border-blue-800"
        >
          <Plus className="w-5 h-5" /> Add {activeTab === "jobs" ? "job" : "application"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "jobs" ? "bg-blue-900 text-white" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
          >
            Jobs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "applications" ? "bg-blue-900 text-white" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
          >
            Applications
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === "jobs" ? "Search jobs..." : "Search by name, email, or job..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        {activeTab === "jobs" && (
          <select
            value={filterJobStatus}
            onChange={(e) => setFilterJobStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        {activeTab === "applications" && (
          <select
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="">All jobs</option>
            {(openJobs.length > 0 ? openJobs : jobs).map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Loading...</div>
      ) : activeTab === "jobs" ? (
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 py-8">No jobs yet. Add a job to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-900 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{job.department || "—"} {job.location ? ` · ${job.location}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditJob(job)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${jobStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                      {job.employmentType}
                    </span>
                  </div>
                  {job.description && <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 line-clamp-2">{job.description}</p>}
                  {job.postedAt && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      Posted {moment(job.postedAt).format("MMM D, YYYY")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 py-8">No applications yet. Add an application or open a job first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApplications.map((app) => (
                <div
                  key={app._id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-900 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{app.candidateName}</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {app.candidateEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditApplication(app)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteApplication(app)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{app.job?.title || "—"}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${applicationStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                    {app.source && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">{app.source}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    Applied {moment(app.appliedAt).format("MMM D, YYYY")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job modal */}
      {showModal && activeTab === "jobs" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowModal(false); resetJobForm(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingItem ? "Edit job" : "Add job"}
              </h2>
            </div>
            <form onSubmit={handleSubmitJob} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Job title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employment type</label>
                  <select
                    value={jobForm.employmentType}
                    onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {JOB_EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={jobForm.status}
                    onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {JOB_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Requirements</label>
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 border border-blue-800">
                  {editingItem ? "Save changes" : "Add job"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetJobForm(); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application modal */}
      {showModal && activeTab === "applications" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowModal(false); resetApplicationForm(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingItem ? "Edit application" : "Add application"}
              </h2>
            </div>
            <form onSubmit={handleSubmitApplication} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Job</label>
                <select
                  value={applicationForm.jobId}
                  onChange={(e) => setApplicationForm({ ...applicationForm, jobId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select job</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>{j.title} {j.department ? `(${j.department})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Candidate name</label>
                  <input
                    type="text"
                    value={applicationForm.candidateName}
                    onChange={(e) => setApplicationForm({ ...applicationForm, candidateName: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={applicationForm.candidateEmail}
                    onChange={(e) => setApplicationForm({ ...applicationForm, candidateEmail: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={applicationForm.candidatePhone}
                    onChange={(e) => setApplicationForm({ ...applicationForm, candidatePhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Source</label>
                  <input
                    type="text"
                    value={applicationForm.source}
                    onChange={(e) => setApplicationForm({ ...applicationForm, source: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="e.g. LinkedIn, Website"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Resume URL</label>
                <input
                  type="url"
                  value={applicationForm.resumeUrl}
                  onChange={(e) => setApplicationForm({ ...applicationForm, resumeUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional link to resume"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={applicationForm.status}
                    onChange={(e) => setApplicationForm({ ...applicationForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Applied date</label>
                  <input
                    type="date"
                    value={applicationForm.appliedAt}
                    onChange={(e) => setApplicationForm({ ...applicationForm, appliedAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Resume / notes</label>
                <textarea
                  value={applicationForm.resumeNotes}
                  onChange={(e) => setApplicationForm({ ...applicationForm, resumeNotes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Internal notes</label>
                <textarea
                  value={applicationForm.notes}
                  onChange={(e) => setApplicationForm({ ...applicationForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 border border-blue-800">
                  {editingItem ? "Save changes" : "Add application"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetApplicationForm(); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300">
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

export default HrRecruitment;
