/**
 * Resource allocation: resource assigned to a work order for a period.
 */
const mongoose = require("mongoose");

const resourceAllocationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allocatedUnits: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "hours" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

resourceAllocationSchema.index({ resource: 1, startDate: 1, endDate: 1 });
resourceAllocationSchema.index({ workOrder: 1 });

module.exports = mongoose.model("ResourceAllocation", resourceAllocationSchema);
