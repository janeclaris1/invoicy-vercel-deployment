const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const User = require('../models/User');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId).select('createdBy').lean();
  if (!currentUser) return [currentUserId.toString()];
  if (!currentUser.createdBy) {
    const team = await User.find({ createdBy: currentUserId }).select('_id').lean();
    return [currentUserId.toString(), ...team.map((m) => m._id.toString())];
  }
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
    ]
  }).select('_id').lean();
  const ids = teamMembers.map(m => m._id.toString());
  if (!ids.includes(currentUserId.toString())) ids.push(currentUserId.toString());
  return ids;
};

// Get salary for current employee (self-service)
const getMySalary = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ message: 'No employee record linked to your account' });
    }

    const salary = await Salary.findOne({ employee: employee._id });
    if (!salary) {
      return res.status(404).json({ message: 'Salary information not found' });
    }

    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all salaries (for HR/admin)
const getSalaries = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employees = await Employee.find({
      $or: [
        { user: { $in: teamMemberIds } },
        { createdBy: { $in: teamMemberIds } },
      ],
    }).select('_id');
    const employeeIds = employees.map(e => e._id);

    const filter = { employee: { $in: employeeIds } };
    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    const salaries = await Salary.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ createdAt: -1 });
    
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create or update salary
const upsertSalary = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(req.body.employeeId);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employeeUserId = employee.user && employee.user.toString();
    const employeeCreatedBy = employee.createdBy && employee.createdBy.toString();
    const canManage = (employeeUserId && teamMemberIds.includes(employeeUserId)) ||
      (employeeCreatedBy && teamMemberIds.includes(employeeCreatedBy));
    if (!canManage) {
      return res.status(403).json({ message: 'You do not have permission to set salary for this employee' });
    }

    const salaryData = {
      user: req.user._id,
      employee: req.body.employeeId,
      baseSalary: req.body.baseSalary,
      currency: req.body.currency || 'GHS',
      payFrequency: req.body.payFrequency || 'Monthly',
      startDate: req.body.startDate,
      notes: req.body.notes || '',
    };

    const salary = await Salary.findOneAndUpdate(
      { employee: req.body.employeeId },
      salaryData,
      { new: true, upsert: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId department position');
    
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete salary
const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(salary.employee);
    if (!employee) {
      return res.status(403).json({ message: 'You do not have permission to delete this salary record' });
    }
    const employeeUserId = employee.user && employee.user.toString();
    const employeeCreatedBy = employee.createdBy && employee.createdBy.toString();
    const canManage = (employeeUserId && teamMemberIds.includes(employeeUserId)) ||
      (employeeCreatedBy && teamMemberIds.includes(employeeCreatedBy));
    if (!canManage) {
      return res.status(403).json({ message: 'You do not have permission to delete this salary record' });
    }

    await Salary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Salary record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMySalary,
  getSalaries,
  upsertSalary,
  deleteSalary,
};
