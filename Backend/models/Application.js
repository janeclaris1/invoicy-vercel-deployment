const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  candidatePhone: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  resumeNotes: { type: String, default: '' },
  source: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'],
    default: 'Applied',
  },
  notes: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ user: 1, appliedAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
