const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#3B82F6' },
  itemCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
