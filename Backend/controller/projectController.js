const Project = require("../models/Project");
const ProjectTask = require("../models/ProjectTask");
const Milestone = require("../models/Milestone");
const TimeEntry = require("../models/TimeEntry");
const User = require("../models/User");

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  if (!currentUser.createdBy) return [currentUserId];
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
    ],
  }).select("_id");
  return teamMembers.map((m) => m._id);
};

// -------- Projects --------
exports.getProjects = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { status } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (status) filter.status = status;
    const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();
    const projectIds = projects.map((p) => p._id);
    const [taskCounts, milestoneCounts, timeSums] = await Promise.all([
      ProjectTask.aggregate([{ $match: { project: { $in: projectIds } } }, { $group: { _id: "$project", count: { $sum: 1 } } }]),
      Milestone.aggregate([{ $match: { project: { $in: projectIds } } }, { $group: { _id: "$project", count: { $sum: 1 } } }]),
      TimeEntry.aggregate([{ $match: { project: { $in: projectIds } } }, { $group: { _id: "$project", hours: { $sum: "$hours" } } }]),
    ]);
    const taskMap = {}; taskCounts.forEach((x) => { taskMap[x._id.toString()] = x.count; });
    const mileMap = {}; milestoneCounts.forEach((x) => { mileMap[x._id.toString()] = x.count; });
    const timeMap = {}; timeSums.forEach((x) => { timeMap[x._id.toString()] = x.hours; });
    const result = projects.map((p) => ({
      ...p,
      taskCount: taskMap[p._id.toString()] || 0,
      milestoneCount: mileMap[p._id.toString()] || 0,
      totalHours: timeMap[p._id.toString()] || 0,
    }));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get projects" });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, budgetAmount, currency, clientName, branch } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Project name is required" });
    const project = await Project.create({
      user: req.user._id,
      name: String(name).trim(),
      description: String(description || "").trim(),
      status: status || "planning",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budgetAmount: budgetAmount != null ? Number(budgetAmount) : null,
      currency: currency || "GHS",
      clientName: String(clientName || "").trim(),
      branch: branch || null,
    });
    return res.status(201).json(project);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create project" });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.id, user: { $in: teamMemberIds } }).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });
    const [taskCount, milestoneCount, totalHours] = await Promise.all([
      ProjectTask.countDocuments({ project: project._id }),
      Milestone.countDocuments({ project: project._id }),
      TimeEntry.aggregate([{ $match: { project: project._id } }, { $group: { _id: null, hours: { $sum: "$hours" } } }]).then((r) => (r[0] && r[0].hours) || 0),
    ]);
    return res.json({ ...project, taskCount, milestoneCount, totalHours });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get project" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const { name, description, status, startDate, endDate, budgetAmount, currency, clientName, branch } = req.body;
    if (name !== undefined) project.name = String(name).trim();
    if (description !== undefined) project.description = String(description).trim();
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
    if (budgetAmount !== undefined) project.budgetAmount = budgetAmount != null ? Number(budgetAmount) : null;
    if (currency !== undefined) project.currency = currency;
    if (clientName !== undefined) project.clientName = String(clientName).trim();
    if (branch !== undefined) project.branch = branch || null;
    await project.save();
    return res.json(project);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update project" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    await ProjectTask.deleteMany({ project: project._id });
    await Milestone.deleteMany({ project: project._id });
    await TimeEntry.deleteMany({ project: project._id });
    await Project.deleteOne({ _id: project._id });
    return res.json({ message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete project" });
  }
};

// -------- Tasks --------
exports.getTasks = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const { status } = req.query;
    const filter = { project: project._id };
    if (status) filter.status = status;
    const tasks = await ProjectTask.find(filter).populate("assignee", "name email").sort({ order: 1, createdAt: 1 }).lean();
    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get tasks" });
  }
};

exports.createTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const { name, description, status, priority, dueDate, estimatedHours, assignee } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Task name is required" });
    const count = await ProjectTask.countDocuments({ project: project._id });
    const task = await ProjectTask.create({
      project: project._id,
      user: req.user._id,
      name: String(name).trim(),
      description: String(description || "").trim(),
      status: status || "todo",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours != null ? Number(estimatedHours) : null,
      assignee: assignee || null,
      order: count,
    });
    const populated = await ProjectTask.findById(task._id).populate("assignee", "name email").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create task" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const task = await ProjectTask.findOne({ _id: req.params.taskId, project: project._id });
    if (!task) return res.status(404).json({ message: "Task not found" });
    const { name, description, status, priority, dueDate, estimatedHours, assignee, completedAt } = req.body;
    if (name !== undefined) task.name = String(name).trim();
    if (description !== undefined) task.description = String(description).trim();
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours != null ? Number(estimatedHours) : null;
    if (assignee !== undefined) task.assignee = assignee || null;
    if (completedAt !== undefined) task.completedAt = completedAt ? new Date(completedAt) : null;
    if (status === "done" && !task.completedAt) task.completedAt = new Date();
    await task.save();
    const populated = await ProjectTask.findById(task._id).populate("assignee", "name email").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update task" });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const task = await ProjectTask.findOne({ _id: req.params.taskId, project: project._id });
    if (!task) return res.status(404).json({ message: "Task not found" });
    await TimeEntry.deleteMany({ task: task._id });
    await ProjectTask.deleteOne({ _id: task._id });
    return res.json({ message: "Task deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete task" });
  }
};

// -------- Milestones --------
exports.getMilestones = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const milestones = await Milestone.find({ project: project._id }).sort({ dueDate: 1 }).lean();
    return res.json(milestones);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get milestones" });
  }
};

exports.createMilestone = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const { name, description, dueDate } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Milestone name is required" });
    const milestone = await Milestone.create({
      project: project._id,
      user: req.user._id,
      name: String(name).trim(),
      description: String(description || "").trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    return res.status(201).json(milestone);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create milestone" });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const milestone = await Milestone.findOne({ _id: req.params.milestoneId, project: project._id });
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    const { name, description, dueDate, status, completedAt } = req.body;
    if (name !== undefined) milestone.name = String(name).trim();
    if (description !== undefined) milestone.description = String(description).trim();
    if (dueDate !== undefined) milestone.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) milestone.status = status;
    if (completedAt !== undefined) milestone.completedAt = completedAt ? new Date(completedAt) : null;
    if (status === "completed" && !milestone.completedAt) milestone.completedAt = new Date();
    await milestone.save();
    return res.json(milestone);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update milestone" });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const project = await Project.findOne({ _id: req.params.projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const milestone = await Milestone.findOne({ _id: req.params.milestoneId, project: project._id });
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    await Milestone.deleteOne({ _id: milestone._id });
    return res.json({ message: "Milestone deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete milestone" });
  }
};

// -------- Time entries --------
exports.getTimeEntries = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { projectId, taskId, from, to, userId } = req.query;
    const filter = {};
    if (projectId) filter.project = projectId;
    if (taskId) filter.task = taskId;
    if (userId) filter.user = userId;
    else filter.user = { $in: teamMemberIds };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const entries = await TimeEntry.find(filter)
      .populate("project", "name status")
      .populate("task", "name status")
      .populate("user", "name email")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json(entries);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get time entries" });
  }
};

exports.createTimeEntry = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { projectId, taskId, hours, date, description } = req.body;
    if (!projectId || hours == null || !date) return res.status(400).json({ message: "projectId, hours, and date are required" });
    const project = await Project.findOne({ _id: projectId, user: { $in: teamMemberIds } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const entry = await TimeEntry.create({
      user: req.user._id,
      project: project._id,
      task: taskId || null,
      hours: Number(hours),
      date: new Date(date),
      description: String(description || "").trim(),
    });
    const populated = await TimeEntry.findById(entry._id)
      .populate("project", "name status")
      .populate("task", "name status")
      .populate("user", "name email")
      .lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create time entry" });
  }
};

exports.updateTimeEntry = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const entry = await TimeEntry.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!entry) return res.status(404).json({ message: "Time entry not found" });
    const { hours, date, description, approved } = req.body;
    if (hours !== undefined) entry.hours = Number(hours);
    if (date !== undefined) entry.date = new Date(date);
    if (description !== undefined) entry.description = String(description).trim();
    if (approved !== undefined) {
      entry.approved = !!approved;
      if (approved) {
        entry.approvedBy = req.user._id;
        entry.approvedAt = new Date();
      } else {
        entry.approvedBy = null;
        entry.approvedAt = null;
      }
    }
    await entry.save();
    const populated = await TimeEntry.findById(entry._id)
      .populate("project", "name status")
      .populate("task", "name status")
      .populate("user", "name email")
      .lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update time entry" });
  }
};

exports.deleteTimeEntry = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const entry = await TimeEntry.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!entry) return res.status(404).json({ message: "Time entry not found" });
    await TimeEntry.deleteOne({ _id: entry._id });
    return res.json({ message: "Time entry deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete time entry" });
  }
};
