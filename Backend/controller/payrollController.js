const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const User = require('../models/User');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId.toString()];
  if (!currentUser.createdBy) return [currentUserId.toString()];
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
      { _id: currentUserId }, // Always include current user
    ]
  }).select('_id');
  const ids = teamMembers.map(m => m._id.toString());
  // Ensure current user is always included
  if (!ids.includes(currentUserId.toString())) {
    ids.push(currentUserId.toString());
  }
  return ids;
};

// Get all payroll records (for HR/admin)
const getPayrollRecords = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    // MongoDB will handle string to ObjectId conversion automatically
    const employees = await Employee.find({ user: { $in: teamMemberIds } }).select('_id');
    const employeeIds = employees.map(e => e._id);

    const filter = { employee: { $in: employeeIds } };
    
    if (req.query.payPeriod) {
      filter.payPeriod = req.query.payPeriod;
    }
    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const payrollRecords = await Payroll.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ payPeriod: -1, createdAt: -1 });
    
    res.json(payrollRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get payroll records for current employee (self-service)
const getMyPayrollRecords = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ message: 'No employee record linked to your account' });
    }

    const filter = { employee: employee._id };
    
    if (req.query.payPeriod) {
      filter.payPeriod = req.query.payPeriod;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const payrollRecords = await Payroll.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ payPeriod: -1, createdAt: -1 });
    
    res.json(payrollRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create payroll record
const createPayrollRecord = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(req.body.employeeId);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // teamMemberIds are already strings, just ensure employee.user is string
    const employeeUserId = employee.user.toString();
    
    if (!teamMemberIds.includes(employeeUserId)) {
      return res.status(403).json({ message: 'You do not have permission to create payroll for this employee' });
    }

    // Get employee's salary currency if not provided
    let currency = req.body.currency || 'GHS';
    if (!req.body.currency) {
      const Salary = require('../models/Salary');
      const salary = await Salary.findOne({ employee: req.body.employeeId });
      if (salary) {
        currency = salary.currency || 'GHS';
      }
    }

    const payrollData = {
      user: req.user._id,
      employee: req.body.employeeId,
      payPeriod: req.body.payPeriod,
      baseSalary: req.body.baseSalary || 0,
      bonuses: req.body.bonuses || 0,
      deductions: req.body.deductions || 0,
      tax: req.body.tax || 0,
      netPay: req.body.netPay || 0,
      currency: currency,
      paymentMethod: req.body.paymentMethod || 'Bank Transfer',
      paymentDate: req.body.paymentDate,
      status: req.body.status || 'Draft',
      notes: req.body.notes || '',
    };

    const payroll = new Payroll(payrollData);
    await payroll.save();
    
    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName employeeId department position');
    
    res.status(201).json(populatedPayroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update payroll record
const updatePayrollRecord = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(payroll.employee);
    
    // teamMemberIds are already strings, just ensure employee.user is string
    const employeeUserId = employee?.user?.toString();
    
    if (!employee || !teamMemberIds.includes(employeeUserId)) {
      return res.status(403).json({ message: 'You do not have permission to update this payroll record' });
    }

    // Get currency from request or employee's salary if not provided
    if (!req.body.currency && !payroll.currency) {
      const Salary = require('../models/Salary');
      const salary = await Salary.findOne({ employee: req.body.employeeId || payroll.employee });
      if (salary) {
        req.body.currency = salary.currency || 'GHS';
      } else {
        req.body.currency = 'GHS';
      }
    } else if (!req.body.currency) {
      req.body.currency = payroll.currency;
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        payroll[key] = req.body[key];
      }
    });

    await payroll.save();
    
    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName employeeId department position');
    
    res.json(populatedPayroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete payroll record
const deletePayrollRecord = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const employee = await Employee.findById(payroll.employee);
    
    // teamMemberIds are already strings, just ensure employee.user is string
    const employeeUserId = employee?.user?.toString();
    
    if (!employee || !teamMemberIds.includes(employeeUserId)) {
      return res.status(403).json({ message: 'You do not have permission to delete this payroll record' });
    }

    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPayrollRecords,
  getMyPayrollRecords,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
};
