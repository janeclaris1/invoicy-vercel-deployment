/**
 * Maintenance schedule: recurring maintenance for a resource.
 */
const mongoose = require("mongoose");

const maintenanceScheduleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    frequency: { type: String, enum: ["daily", "weekly", "monthly", "quarterly"], default: "monthly" },
    description: { type: String, default: "" },
    lastDoneAt: { type: Date, default: null },
    nextDueAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

maintenanceScheduleSchema.index({ resource: 1 });
maintenanceScheduleSchema.index({ nextDueAt: 1 });

module.exports = mongoose.model("MaintenanceSchedule", maintenanceScheduleSchema);
