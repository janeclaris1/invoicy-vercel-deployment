const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  description: { type: String, default: '' },
}, { timestamps: true });

departmentSchema.index({ user: 1 });
departmentSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
