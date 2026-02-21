const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  reviewCycle: { type: String, default: '' },
  reviewDate: { type: Date, default: null },
  rating: {
    type: String,
    enum: ['Exceptional', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory'],
    default: 'Meets Expectations',
  },
  strengths: { type: String, default: '' },
  areasForImprovement: { type: String, default: '' },
  goalsSet: { type: String, default: '' },
  reviewerNotes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Draft', 'Completed'],
    default: 'Draft',
  },
}, { timestamps: true });

performanceReviewSchema.index({ employee: 1, reviewDate: -1 });
performanceReviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
