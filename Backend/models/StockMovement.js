const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  type: { type: String, enum: ['in', 'out', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, default: '' },
  reference: { type: String, default: '' }, // e.g. invoice id, PO number
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

stockMovementSchema.index({ item: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
