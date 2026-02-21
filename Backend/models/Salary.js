const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
  baseSalary: { type: Number, required: true },
  currency: { type: String, default: 'GHS' },
  payFrequency: { 
    type: String, 
    enum: ['Monthly', 'Bi-weekly', 'Weekly', 'Annual'], 
    default: 'Monthly' 
  },
  startDate: { type: Date, required: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Salary', salarySchema);
