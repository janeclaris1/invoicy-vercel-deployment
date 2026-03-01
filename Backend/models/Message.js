const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', default: null },
  // recipient required for 1:1; group required for group messages
  body: { type: String, default: '' },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
  readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date, default: Date.now } }],
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  attachments: [{
    url: { type: String, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, default: 'application/octet-stream' },
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, readAt: 1 });
messageSchema.index({ recipient: 1, deliveredAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
