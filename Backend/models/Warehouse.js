const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "" },
    address: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

warehouseSchema.index({ user: 1 });
module.exports = mongoose.model("Warehouse", warehouseSchema);
