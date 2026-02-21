const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  department: { type: String, default: '' },
  location: { type: String, default: '' },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer'],
    default: 'Full-time',
  },
  description: { type: String, default: '' },
  requirements: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Draft', 'Open', 'Closed'],
    default: 'Draft',
  },
  postedAt: { type: Date, default: null },
}, { timestamps: true });

jobSchema.index({ user: 1, status: 1 });
jobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
