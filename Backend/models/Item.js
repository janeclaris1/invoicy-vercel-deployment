const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  categoryColor: { type: String, default: '#3B82F6' },
  price: { type: Number, required: true },
  unit: { type: String, default: 'unit' },
  sku: { type: String, default: '' },
  taxRate: { type: Number, default: 0 },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
