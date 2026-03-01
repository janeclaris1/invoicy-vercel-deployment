/**
 * TimeEntry — time logged against a task/project for billing and tracking.
 */
const mongoose = require("mongoose");

const timeEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectTask", default: null },
    hours: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, default: "" },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

timeEntrySchema.index({ user: 1, date: -1 });
timeEntrySchema.index({ project: 1, date: -1 });
timeEntrySchema.index({ task: 1 });

module.exports = mongoose.model("TimeEntry", timeEntrySchema);
