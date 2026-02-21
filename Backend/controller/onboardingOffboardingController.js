const User = require('../models/User');
const Employee = require('../models/Employee');
const OnboardingTask = require('../models/OnboardingTask');
const OffboardingTask = require('../models/OffboardingTask');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  if (!currentUser.createdBy) return [currentUserId];
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
    ]
  }).select('_id');
  return teamMembers.map(m => m._id);
};

// -------- Onboarding --------
const getOnboardingTasks = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map(e => e._id);
    const filter = { user: { $in: teamMemberIds }, employee: { $in: employeeIds } };
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    const tasks = await OnboardingTask.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get onboarding tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createOnboardingTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!teamMemberIds.some(id => id.toString() === employee.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to add tasks for this employee' });
    }
    const task = await OnboardingTask.create({
      user: req.user._id,
      employee: req.body.employeeId,
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'Other',
      dueDate: req.body.dueDate || null,
      status: req.body.status || 'Pending',
      priority: req.body.priority || 'Medium',
      notes: req.body.notes || '',
    });
    const populated = await OnboardingTask.findById(task._id).populate('employee', 'firstName lastName employeeId department');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create onboarding task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateOnboardingTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const task = await OnboardingTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!teamMemberIds.some(id => id.toString() === task.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    const fields = ['title', 'description', 'category', 'dueDate', 'status', 'priority', 'notes'];
    fields.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    if (req.body.status === 'Completed') {
      task.completedAt = task.completedAt || new Date();
      task.completedBy = req.user._id;
    }
    await task.save();
    const populated = await OnboardingTask.findById(task._id).populate('employee', 'firstName lastName employeeId department');
    res.json(populated);
  } catch (error) {
    console.error('Update onboarding task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteOnboardingTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const task = await OnboardingTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!teamMemberIds.some(id => id.toString() === task.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }
    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete onboarding task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------- Offboarding --------
const getOffboardingTasks = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map(e => e._id);
    const filter = { user: { $in: teamMemberIds }, employee: { $in: employeeIds } };
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    const tasks = await OffboardingTask.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get offboarding tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createOffboardingTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!teamMemberIds.some(id => id.toString() === employee.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to add tasks for this employee' });
    }
    const task = await OffboardingTask.create({
      user: req.user._id,
      employee: req.body.employeeId,
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'Other',
      dueDate: req.body.dueDate || null,
      status: req.body.status || 'Pending',
      priority: req.body.priority || 'Medium',
      notes: req.body.notes || '',
      exitDate: req.body.exitDate || null,
      exitReason: req.body.exitReason || '',
      exitInterviewNotes: req.body.exitInterviewNotes || '',
    });
    const populated = await OffboardingTask.findById(task._id).populate('employee', 'firstName lastName employeeId department');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create offboarding task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateOffboardingTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const task = await OffboardingTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!teamMemberIds.some(id => id.toString() === task.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    const fields = ['title', 'description', 'category', 'dueDate', 'status', 'priority', 'notes', 'exitDate', 'exitReason', 'exitInterviewNotes'];
    fields.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    if (req.body.status === 'Completed') {
      task.completedAt = task.completedAt || new Date();
      task.completedBy = req.user._id;
    }
    await task.save();
    const populated = await OffboardingTask.findById(task._id).populate('employee', 'firstName lastName employeeId department');
    res.json(populated);
  } catch (error) {
    console.error('Update offboarding task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteOffboardingTask = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const task = await OffboardingTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!teamMemberIds.some(id => id.toString() === task.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }
    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete offboarding task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getOnboardingTasks,
  createOnboardingTask,
  updateOnboardingTask,
  deleteOnboardingTask,
  getOffboardingTasks,
  createOffboardingTask,
  updateOffboardingTask,
  deleteOffboardingTask,
};
