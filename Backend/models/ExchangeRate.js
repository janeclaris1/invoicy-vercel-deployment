/**
 * ExchangeRate — multi-currency; effective rate from a given date.
 */
const mongoose = require("mongoose");

const exchangeRateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromCurrency: { type: String, required: true, trim: true },
    toCurrency: { type: String, required: true, trim: true },
    rate: { type: Number, required: true },
    effectiveFrom: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

exchangeRateSchema.index({ user: 1, fromCurrency: 1, toCurrency: 1, effectiveFrom: -1 });

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
