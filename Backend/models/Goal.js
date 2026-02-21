const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  dueDate: { type: Date, default: null },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed'],
    default: 'Not Started',
  },
}, { timestamps: true });

goalSchema.index({ employee: 1, status: 1 });
goalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Goal', goalSchema);
