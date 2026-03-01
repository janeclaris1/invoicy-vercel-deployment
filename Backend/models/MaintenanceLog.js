/**
 * Maintenance log: record of maintenance performed on a resource.
 */
const mongoose = require("mongoose");

const maintenanceLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceSchedule", default: null },
    performedAt: { type: Date, required: true },
    description: { type: String, default: "" },
    performedBy: { type: String, default: "" },
    outcome: { type: String, enum: ["ok", "issues", "deferred"], default: "ok" },
  },
  { timestamps: true }
);

maintenanceLogSchema.index({ resource: 1, performedAt: -1 });

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
