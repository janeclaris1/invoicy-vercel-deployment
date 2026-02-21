const Employee = require('../models/Employee');
const User = require('../models/User');

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

const getMyEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return res.status(404).json({ message: 'No employee record linked to your account' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SELF_SERVICE_FIELDS = ['phone', 'address', 'city', 'country', 'emergencyContact', 'emergencyPhone'];
const updateMyEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return res.status(404).json({ message: 'No employee record linked to your account' });
    SELF_SERVICE_FIELDS.forEach(f => { if (req.body[f] !== undefined) employee[f] = req.body[f]; });
    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({
      $or: [
        { user: { $in: teamMemberIds } },
        { createdBy: { $in: teamMemberIds } },
      ],
    }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List employees that have no user account yet (for creating users in Team & Users)
// Includes: new employees (user null, createdBy in team) and legacy employees (user was set to creator, createdBy null)
const getEmployeesWithoutUser = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({
      $or: [
        { user: null, createdBy: { $in: teamMemberIds } },
        { user: { $in: teamMemberIds }, createdBy: null },
      ],
    })
      .select('_id firstName lastName email employeeId')
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    let employeeId = (req.body.employeeId || '').trim();
    if (!employeeId) {
      const count = await Employee.countDocuments({ $or: [{ user: { $in: teamMemberIds } }, { createdBy: { $in: teamMemberIds } }] });
      employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
    }
    const fields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'country', 'department', 'position', 'hireDate', 'status', 'emergencyContact', 'emergencyPhone', 'taxId', 'nationalId', 'complianceNotes', 'notes'];
    const payload = { createdBy: req.user._id, user: null, employeeId };
    fields.forEach(f => { if (req.body[f] !== undefined) payload[f] = req.body[f]; });
    if (payload.dateOfBirth === '') payload.dateOfBirth = null;
    if (payload.hireDate === '') payload.hireDate = null;
    const employee = await Employee.create(payload);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const canAccess = (employee.user && teamMemberIds.some(id => id.toString() === employee.user.toString())) ||
      (employee.createdBy && teamMemberIds.some(id => id.toString() === employee.createdBy.toString()));
    if (!canAccess) return res.status(403).json({ message: 'Not authorized' });
    const fields = ['employeeId', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'country', 'department', 'position', 'hireDate', 'status', 'emergencyContact', 'emergencyPhone', 'taxId', 'nationalId', 'complianceNotes', 'notes'];
    fields.forEach(f => { if (req.body[f] !== undefined) employee[f] = req.body[f]; });
    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const canAccess = (employee.user && teamMemberIds.some(id => id.toString() === employee.user.toString())) ||
      (employee.createdBy && teamMemberIds.some(id => id.toString() === employee.createdBy.toString()));
    if (!canAccess) return res.status(403).json({ message: 'Not authorized' });
    await employee.deleteOne();
    res.json({ message: 'Employee removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyEmployee, updateMyEmployee, getEmployees, getEmployeesWithoutUser, createEmployee, updateEmployee, deleteEmployee };
