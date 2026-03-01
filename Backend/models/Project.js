const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["planning", "active", "on_hold", "completed", "cancelled"], default: "planning" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    budgetAmount: { type: Number, default: null },
    currency: { type: String, default: "GHS" },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    clientName: { type: String, default: "" },
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, status: 1 });
projectSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
