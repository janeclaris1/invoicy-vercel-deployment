const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["machine", "labor"], default: "machine" },
    capacityPerDay: { type: Number, default: null },
    capacityUnit: { type: String, default: "hours" },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

resourceSchema.index({ user: 1 });
module.exports = mongoose.model("Resource", resourceSchema);
