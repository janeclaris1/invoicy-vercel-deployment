const mongoose = require("mongoose");

const forecastSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    periodType: { type: String, enum: ["monthly", "weekly"], default: "monthly" },
    periodYear: { type: Number, required: true },
    periodMonth: { type: Number, default: null },
    periodWeek: { type: Number, default: null },
    quantity: { type: Number, required: true },
    source: { type: String, enum: ["manual", "system"], default: "manual" },
  },
  { timestamps: true }
);

forecastSchema.index({ user: 1, item: 1, periodYear: 1, periodMonth: 1, periodWeek: 1 });
forecastSchema.index({ item: 1 });

module.exports = mongoose.model("Forecast", forecastSchema);
