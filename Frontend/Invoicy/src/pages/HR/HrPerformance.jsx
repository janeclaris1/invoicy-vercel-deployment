import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, User, Calendar, Award, Target } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import moment from "moment";

const REVIEW_RATINGS = [
  "Exceptional",
  "Exceeds Expectations",
  "Meets Expectations",
  "Needs Improvement",
  "Unsatisfactory",
];
const REVIEW_STATUSES = ["Draft", "Completed"];
const GOAL_STATUSES = ["Not Started", "In Progress", "Completed"];

const HrPerformance = () => {
  const [activeTab, setActiveTab] = useState("reviews");
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    employeeId: "",
    reviewCycle: "",
    reviewDate: "",
    rating: "Meets Expectations",
    strengths: "",
    areasForImprovement: "",
    goalsSet: "",
    reviewerNotes: "",
    status: "Draft",
  });
  const [goalForm, setGoalForm] = useState({
    employeeId: "",
    title: "",
    description: "",
    dueDate: "",
    progress: 0,
    status: "Not Started",
  });

  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.EMPLOYEES.GET_ALL);
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
      setEmployees([]);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HR_PERFORMANCE.REVIEWS);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load reviews");
      setReviews([]);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.HR_PERFORMANCE.GOALS);
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load goals");
      setGoals([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchReviews(), fetchGoals()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetReviewForm = () => {
    setReviewForm({
      employeeId: "",
      reviewCycle: "",
      reviewDate: "",
      rating: "Meets Expectations",
      strengths: "",
      areasForImprovement: "",
      goalsSet: "",
      reviewerNotes: "",
      status: "Draft",
    });
    setEditingItem(null);
  };

  const resetGoalForm = () => {
    setGoalForm({
      employeeId: "",
      title: "",
      description: "",
      dueDate: "",
      progress: 0,
      status: "Not Started",
    });
    setEditingItem(null);
  };

  const openAddReview = () => {
    resetReviewForm();
    setReviewForm((prev) => ({ ...prev, employeeId: filterEmployeeId || employees[0]?._id || "" }));
    setShowModal(true);
  };

  const openAddGoal = () => {
    resetGoalForm();
    setGoalForm((prev) => ({ ...prev, employeeId: filterEmployeeId || employees[0]?._id || "" }));
    setShowModal(true);
  };

  const openEditReview = (review) => {
    setEditingItem(review);
    setReviewForm({
      employeeId: review.employee?._id || review.employee,
      reviewCycle: review.reviewCycle || "",
      reviewDate: review.reviewDate ? moment(review.reviewDate).format("YYYY-MM-DD") : "",
      rating: review.rating || "Meets Expectations",
      strengths: review.strengths || "",
      areasForImprovement: review.areasForImprovement || "",
      goalsSet: review.goalsSet || "",
      reviewerNotes: review.reviewerNotes || "",
      status: review.status || "Draft",
    });
    setShowModal(true);
  };

  const openEditGoal = (goal) => {
    setEditingItem(goal);
    setGoalForm({
      employeeId: goal.employee?._id || goal.employee,
      title: goal.title || "",
      description: goal.description || "",
      dueDate: goal.dueDate ? moment(goal.dueDate).format("YYYY-MM-DD") : "",
      progress: goal.progress ?? 0,
      status: goal.status || "Not Started",
    });
    setShowModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axiosInstance.put(API_PATHS.HR_PERFORMANCE.REVIEWS_BY_ID(editingItem._id), {
          reviewCycle: reviewForm.reviewCycle,
          reviewDate: reviewForm.reviewDate || null,
          rating: reviewForm.rating,
          strengths: reviewForm.strengths,
          areasForImprovement: reviewForm.areasForImprovement,
          goalsSet: reviewForm.goalsSet,
          reviewerNotes: reviewForm.reviewerNotes,
          status: reviewForm.status,
        });
        toast.success("Review updated");
      } else {
        await axiosInstance.post(API_PATHS.HR_PERFORMANCE.REVIEWS, {
          employeeId: reviewForm.employeeId,
          reviewCycle: reviewForm.reviewCycle,
          reviewDate: reviewForm.reviewDate || null,
          rating: reviewForm.rating,
          strengths: reviewForm.strengths,
          areasForImprovement: reviewForm.areasForImprovement,
          goalsSet: reviewForm.goalsSet,
          reviewerNotes: reviewForm.reviewerNotes,
          status: reviewForm.status,
        });
        toast.success("Review added");
      }
      setShowModal(false);
      resetReviewForm();
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save review");
    }
  };

  const handleSubmitGoal = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axiosInstance.put(API_PATHS.HR_PERFORMANCE.GOALS_BY_ID(editingItem._id), {
          title: goalForm.title,
          description: goalForm.description,
          dueDate: goalForm.dueDate || null,
          progress: Number(goalForm.progress),
          status: goalForm.status,
        });
        toast.success("Goal updated");
      } else {
        await axiosInstance.post(API_PATHS.HR_PERFORMANCE.GOALS, {
          employeeId: goalForm.employeeId,
          title: goalForm.title,
          description: goalForm.description,
          dueDate: goalForm.dueDate || null,
          progress: Number(goalForm.progress),
          status: goalForm.status,
        });
        toast.success("Goal added");
      }
      setShowModal(false);
      resetGoalForm();
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save goal");
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm("Delete this performance review?")) return;
    try {
      await axiosInstance.delete(API_PATHS.HR_PERFORMANCE.REVIEWS_BY_ID(review._id));
      toast.success("Review deleted");
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleDeleteGoal = async (goal) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await axiosInstance.delete(API_PATHS.HR_PERFORMANCE.GOALS_BY_ID(goal._id));
      toast.success("Goal deleted");
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const getEmployeeName = (item) => {
    const emp = item.employee;
    if (!emp) return "Unknown";
    return `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeId || "Unknown";
  };

  const filteredReviews = reviews.filter((r) => {
    const emp = r.employee;
    const name = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase() : "";
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || (emp?.employeeId || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmployee = !filterEmployeeId || (emp?._id || r.employee) === filterEmployeeId;
    return matchSearch && matchEmployee;
  });

  const filteredGoals = goals.filter((g) => {
    const emp = g.employee;
    const name = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase() : "";
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || (emp?.employeeId || "").toLowerCase().includes(searchTerm.toLowerCase()) || (g.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmployee = !filterEmployeeId || (emp?._id || g.employee) === filterEmployeeId;
    return matchSearch && matchEmployee;
  });

  const ratingColor = (rating) => {
    switch (rating) {
      case "Exceptional": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Exceeds Expectations": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Meets Expectations": return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
      case "Needs Improvement": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "Unsatisfactory": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const goalStatusColor = (status) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "In Progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Performance & Talent</h1>
          <p className="text-gray-600 dark:text-slate-400">Manage performance reviews and goals.</p>
        </div>
        <button
          onClick={activeTab === "reviews" ? openAddReview : openAddGoal}
          className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shrink-0 border border-blue-800"
        >
          <Plus className="w-5 h-5" /> Add {activeTab === "reviews" ? "review" : "goal"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "reviews" ? "bg-blue-900 text-white" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
          >
            Performance Reviews
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "goals" ? "bg-blue-900 text-white" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
          >
            Goals
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterEmployeeId}
          onChange={(e) => setFilterEmployeeId(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value="">All employees</option>
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Loading...</div>
      ) : activeTab === "reviews" ? (
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 py-8">No performance reviews yet. Add a review to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-900 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{getEmployeeName(review)}</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{review.employee?.employeeId || ""} {review.employee?.position ? ` · ${review.employee.position}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditReview(review)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {review.reviewCycle && <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{review.reviewCycle}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ratingColor(review.rating)}`}>
                      <Award className="w-3 h-3 mr-1" /> {review.rating}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${review.status === "Completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"}`}>
                      {review.status}
                    </span>
                  </div>
                  {review.strengths && <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 line-clamp-2">{review.strengths}</p>}
                  {review.reviewDate && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {moment(review.reviewDate).format("MMM D, YYYY")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 py-8">No goals yet. Add a goal to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGoals.map((goal) => (
                <div
                  key={goal._id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-900 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{getEmployeeName(goal)}</h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{goal.employee?.employeeId || ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">{goal.title}</h4>
                  {goal.description && <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 line-clamp-2">{goal.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${goalStatusColor(goal.status)}`}>
                      <Target className="w-3 h-3 mr-1" /> {goal.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                      {goal.progress}%
                    </span>
                  </div>
                  {goal.dueDate && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      Due {moment(goal.dueDate).format("MMM D, YYYY")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review modal */}
      {showModal && activeTab === "reviews" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowModal(false); resetReviewForm(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingItem ? "Edit review" : "Add performance review"}
              </h2>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee</label>
                  <select
                    value={reviewForm.employeeId}
                    onChange={(e) => setReviewForm({ ...reviewForm, employeeId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Review cycle</label>
                  <input
                    type="text"
                    value={reviewForm.reviewCycle}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewCycle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="e.g. Q1 2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Review date</label>
                  <input
                    type="date"
                    value={reviewForm.reviewDate}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rating</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {REVIEW_RATINGS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={reviewForm.status}
                    onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {REVIEW_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Strengths</label>
                <textarea
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Areas for improvement</label>
                <textarea
                  value={reviewForm.areasForImprovement}
                  onChange={(e) => setReviewForm({ ...reviewForm, areasForImprovement: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Goals set</label>
                <textarea
                  value={reviewForm.goalsSet}
                  onChange={(e) => setReviewForm({ ...reviewForm, goalsSet: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reviewer notes</label>
                <textarea
                  value={reviewForm.reviewerNotes}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewerNotes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 border border-blue-800">
                  {editingItem ? "Save changes" : "Add review"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetReviewForm(); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal modal */}
      {showModal && activeTab === "goals" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowModal(false); resetGoalForm(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingItem ? "Edit goal" : "Add goal"}
              </h2>
            </div>
            <form onSubmit={handleSubmitGoal} className="p-6 space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee</label>
                  <select
                    value={goalForm.employeeId}
                    onChange={(e) => setGoalForm({ ...goalForm, employeeId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Goal title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Due date</label>
                  <input
                    type="date"
                    value={goalForm.dueDate}
                    onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={goalForm.progress}
                    onChange={(e) => setGoalForm({ ...goalForm, progress: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={goalForm.status}
                  onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  {GOAL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 border border-blue-800">
                  {editingItem ? "Save changes" : "Add goal"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetGoalForm(); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300">
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

export default HrPerformance;
