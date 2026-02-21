const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['Annual', 'Sick', 'Unpaid', 'Maternity', 'Paternity', 'Other'], default: 'Annual' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, default: 1 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
