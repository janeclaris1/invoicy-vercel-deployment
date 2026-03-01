/**
 * Milestone — key deliverable or checkpoint for a project.
 */
const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
  },
  { timestamps: true }
);

milestoneSchema.index({ project: 1 });

module.exports = mongoose.model("Milestone", milestoneSchema);
