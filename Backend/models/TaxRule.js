/**
 * TaxRule — tax rates by type (VAT, sales, etc.) for compliance and reporting.
 */
const mongoose = require("mongoose");

const taxRuleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "" },
    rate: { type: Number, required: true },
    type: { type: String, enum: ["VAT", "sales", "withholding", "other"], default: "VAT" },
    region: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taxRuleSchema.index({ user: 1, code: 1 });

module.exports = mongoose.model("TaxRule", taxRuleSchema);
