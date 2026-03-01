const mongoose = require("mongoose");

const bomSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parentItem: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    childItem: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unit: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

bomSchema.index({ user: 1, parentItem: 1, childItem: 1 });
bomSchema.index({ parentItem: 1 });
module.exports = mongoose.model("BOM", bomSchema);
