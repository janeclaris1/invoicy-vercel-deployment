const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  employeeId: { type: String, default: '' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  dateOfBirth: { type: Date, default: null },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  department: { type: String, default: '' },
  position: { type: String, default: '' },
  hireDate: { type: Date, default: null },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  emergencyContact: { type: String, default: '' },
  emergencyPhone: { type: String, default: '' },
  taxId: { type: String, default: '' },
  nationalId: { type: String, default: '' },
  complianceNotes: { type: String, default: '' },
  notes: { type: String, default: '' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
}, { timestamps: true });

employeeSchema.index({ branch: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
