const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    website: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    industry: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

companySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Company", companySchema);
