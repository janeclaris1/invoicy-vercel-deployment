const mongoose = require('mongoose');

const offboardingTaskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { 
    type: String, 
    enum: ['Documentation', 'IT Deactivation', 'HR Forms', 'Exit Interview', 'Asset Return', 'Final Payroll', 'Other'],
    default: 'Other'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueDate: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
    default: 'Pending'
  },
  completedAt: { type: Date, default: null },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, default: '' },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  exitDate: { type: Date, default: null },
  exitReason: { type: String, default: '' },
  exitInterviewNotes: { type: String, default: '' },
}, { timestamps: true });

offboardingTaskSchema.index({ employee: 1, status: 1 });
offboardingTaskSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('OffboardingTask', offboardingTaskSchema);
