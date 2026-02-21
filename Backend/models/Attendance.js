const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  hoursWorked: { type: Number, default: 0 },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half-day', 'Leave', 'Off'], default: 'Present' },
  notes: { type: String, default: '' },
}, { timestamps: true });

attendanceSchema.index({ user: 1, employee: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', attendanceSchema);
