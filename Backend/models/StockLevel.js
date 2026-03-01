const mongoose = require("mongoose");

const stockLevelSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, default: 0 },
  },
  { timestamps: true }
);

stockLevelSchema.index({ user: 1, warehouse: 1, item: 1 }, { unique: true });
module.exports = mongoose.model("StockLevel", stockLevelSchema);
