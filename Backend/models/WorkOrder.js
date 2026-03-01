const mongoose = require("mongoose");

const workOrderLineSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["consumption", "production"], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 0 },
    quantityDone: { type: Number, default: 0 },
    unit: { type: String, default: "" },
  },
  { _id: true }
);

const workOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    orderNumber: { type: String, required: true, trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 1 },
    quantityProduced: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "scheduled", "in_progress", "completed", "cancelled"], default: "draft" },
    dueDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lines: [workOrderLineSchema],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

workOrderSchema.index({ user: 1, orderNumber: 1 });
workOrderSchema.index({ user: 1, status: 1 });
module.exports = mongoose.model("WorkOrder", workOrderSchema);
