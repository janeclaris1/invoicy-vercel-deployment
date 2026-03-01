/**
 * Budget — planned amount per account for a period (year/month).
 * Used for variance reporting.
 */
const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    periodType: { type: String, enum: ["monthly", "quarterly", "yearly"], default: "yearly" },
    periodYear: { type: Number, required: true },
    periodMonth: { type: Number, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "GHS" },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, account: 1, periodYear: 1, periodMonth: 1 });

module.exports = mongoose.model("Budget", budgetSchema);
