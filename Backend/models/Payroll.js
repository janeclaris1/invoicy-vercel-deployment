const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  payPeriod: { type: String, required: true }, // Format: "YYYY-MM"
  baseSalary: { type: Number, required: true, default: 0 },
  bonuses: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  netPay: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'GHS' },
  paymentMethod: { 
    type: String, 
    enum: ['Bank Transfer', 'Check', 'Cash', 'PayPal', 'Other'], 
    default: 'Bank Transfer' 
  },
  paymentDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Draft', 'Pending', 'Processed', 'Paid', 'Cancelled'], 
    default: 'Draft' 
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Index for efficient queries
payrollSchema.index({ employee: 1, payPeriod: 1 });
payrollSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payroll', payrollSchema);
