const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

chatGroupSchema.index({ participants: 1 });
chatGroupSchema.index({ createdBy: 1 });

module.exports = mongoose.model('ChatGroup', chatGroupSchema);
