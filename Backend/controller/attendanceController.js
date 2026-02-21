const Attendance = require('../models/Attendance');
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

const getAttendance = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map(e => e._id);
    const filter = { employee: { $in: employeeIds } };
    if (req.query.date) {
      const d = new Date(req.query.date);
      const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
      const end = new Date(d); end.setUTCDate(end.getUTCDate() + 1); end.setUTCHours(0, 0, 0, 0);
      filter.date = { $gte: start, $lt: end };
    }
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    const records = await Attendance.find(filter).populate('employee', 'firstName lastName employeeId department').sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const upsertAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, hoursWorked, status, notes } = req.body;
    if (!employeeId || !date) return res.status(400).json({ message: 'Employee and date are required' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const emp = await Employee.findOne({ _id: employeeId, user: { $in: teamMemberIds } });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    let record = await Attendance.findOne({ user: req.user._id, employee: employeeId, date: d });
    if (record) {
      if (checkIn !== undefined) record.checkIn = checkIn ? new Date(checkIn) : null;
      if (checkOut !== undefined) record.checkOut = checkOut ? new Date(checkOut) : null;
      if (hoursWorked !== undefined) record.hoursWorked = Number(hoursWorked);
      if (status !== undefined) record.status = status;
      if (notes !== undefined) record.notes = notes;
      await record.save();
    } else {
      record = await Attendance.create({
        user: req.user._id, employee: employeeId, date: d,
        checkIn: checkIn ? new Date(checkIn) : null, checkOut: checkOut ? new Date(checkOut) : null,
        hoursWorked: Number(hoursWorked) || 0, status: status || 'Present', notes: notes || '',
      });
    }
    const populated = await Attendance.findById(record._id).populate('employee', 'firstName lastName employeeId department');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const emp = await Employee.findById(record.employee);
    if (!emp || !teamMemberIds.some(id => id.toString() === emp.user.toString())) return res.status(401).json({ message: 'Not authorized' });
    await record.deleteOne();
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAttendance, upsertAttendance, deleteAttendance };
