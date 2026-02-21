const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const User = require('../models/User');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  if (!currentUser.createdBy) return [currentUserId];
  const teamMembers = await User.find({
    $or: [{ createdBy: currentUser.createdBy }, { _id: currentUser.createdBy }]
  }).select('_id');
  return teamMembers.map(m => m._id);
};

const getLeaveRequests = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map(e => e._id);
    const filter = { employee: { $in: employeeIds } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    const requests = await LeaveRequest.find(filter).populate('employee', 'firstName lastName employeeId department').sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createLeaveRequest = async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, days, notes } = req.body;
    if (!employeeId || !startDate || !endDate) return res.status(400).json({ message: 'Employee, start date and end date are required' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const emp = await Employee.findOne({ _id: employeeId, user: { $in: teamMemberIds } });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    const start = new Date(startDate); const end = new Date(endDate);
    const daysCount = days != null ? Number(days) : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const request = await LeaveRequest.create({
      user: req.user._id, employee: employeeId, type: type || 'Annual',
      startDate: start, endDate: end, days: daysCount, status: 'Pending', notes: notes || '',
    });
    const populated = await LeaveRequest.findById(request._id).populate('employee', 'firstName lastName employeeId department');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLeaveRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const emp = await Employee.findById(request.employee);
    if (!emp || !teamMemberIds.some(id => id.toString() === emp.user.toString())) return res.status(401).json({ message: 'Not authorized' });
    if (req.body.status) request.status = req.body.status;
    if (req.body.notes !== undefined) request.notes = req.body.notes;
    await request.save();
    const populated = await LeaveRequest.findById(request._id).populate('employee', 'firstName lastName employeeId department');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLeaveRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const emp = await Employee.findById(request.employee);
    if (!emp || !teamMemberIds.some(id => id.toString() === emp.user.toString())) return res.status(401).json({ message: 'Not authorized' });
    await request.deleteOne();
    res.json({ message: 'Leave request deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getLeaveRequests, createLeaveRequest, updateLeaveRequest, deleteLeaveRequest };
