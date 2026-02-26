const mongoose = require("mongoose");

const ACTIVITY_TYPES = ["email", "call", "meeting", "note", "task"];

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", default: null },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    location: { type: String, default: "", trim: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

activitySchema.index({ user: 1, contact: 1, createdAt: -1 });
activitySchema.index({ user: 1, lead: 1, createdAt: -1 });
activitySchema.index({ user: 1, deal: 1, createdAt: -1 });
activitySchema.index({ user: 1, type: 1, dueDate: 1 });

module.exports = mongoose.model("Activity", activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
