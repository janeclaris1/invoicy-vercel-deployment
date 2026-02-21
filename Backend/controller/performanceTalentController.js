const User = require('../models/User');
const Employee = require('../models/Employee');
const PerformanceReview = require('../models/PerformanceReview');
const Goal = require('../models/Goal');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  if (!currentUser.createdBy) return [currentUserId];
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
    ],
  }).select('_id');
  return teamMembers.map((m) => m._id);
};

// -------- Performance Reviews --------
const getPerformanceReviews = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map((e) => e._id);
    const filter = { user: { $in: teamMemberIds }, employee: { $in: employeeIds } };
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    const reviews = await PerformanceReview.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ reviewDate: -1, createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Get performance reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createPerformanceReview = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!teamMemberIds.some((id) => id.toString() === employee.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to add reviews for this employee' });
    }
    const review = await PerformanceReview.create({
      user: req.user._id,
      employee: req.body.employeeId,
      reviewCycle: req.body.reviewCycle || '',
      reviewDate: req.body.reviewDate || null,
      rating: req.body.rating || 'Meets Expectations',
      strengths: req.body.strengths || '',
      areasForImprovement: req.body.areasForImprovement || '',
      goalsSet: req.body.goalsSet || '',
      reviewerNotes: req.body.reviewerNotes || '',
      status: req.body.status || 'Draft',
    });
    const populated = await PerformanceReview.findById(review._id).populate(
      'employee',
      'firstName lastName employeeId department position'
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create performance review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePerformanceReview = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const review = await PerformanceReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!teamMemberIds.some((id) => id.toString() === review.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }
    const fields = [
      'reviewCycle',
      'reviewDate',
      'rating',
      'strengths',
      'areasForImprovement',
      'goalsSet',
      'reviewerNotes',
      'status',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) review[f] = req.body[f];
    });
    await review.save();
    const populated = await PerformanceReview.findById(review._id).populate(
      'employee',
      'firstName lastName employeeId department position'
    );
    res.json(populated);
  } catch (error) {
    console.error('Update performance review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePerformanceReview = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const review = await PerformanceReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!teamMemberIds.some((id) => id.toString() === review.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }
    await PerformanceReview.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Delete performance review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------- Goals --------
const getGoals = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map((e) => e._id);
    const filter = { user: { $in: teamMemberIds }, employee: { $in: employeeIds } };
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    const goals = await Goal.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ dueDate: 1, createdAt: -1 });
    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createGoal = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!teamMemberIds.some((id) => id.toString() === employee.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to add goals for this employee' });
    }
    const goal = await Goal.create({
      user: req.user._id,
      employee: req.body.employeeId,
      title: req.body.title,
      description: req.body.description || '',
      dueDate: req.body.dueDate || null,
      progress: req.body.progress ?? 0,
      status: req.body.status || 'Not Started',
    });
    const populated = await Goal.findById(goal._id).populate(
      'employee',
      'firstName lastName employeeId department position'
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateGoal = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!teamMemberIds.some((id) => id.toString() === goal.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this goal' });
    }
    const fields = ['title', 'description', 'dueDate', 'progress', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) goal[f] = req.body[f];
    });
    await goal.save();
    const populated = await Goal.findById(goal._id).populate(
      'employee',
      'firstName lastName employeeId department position'
    );
    res.json(populated);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!teamMemberIds.some((id) => id.toString() === goal.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this goal' });
    }
    await Goal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getPerformanceReviews,
  createPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};
