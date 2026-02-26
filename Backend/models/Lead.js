const mongoose = require("mongoose");

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

const leadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new" },
    score: { type: Number, default: 0 }, // 0-100 lead scoring
    source: { type: String, default: "", trim: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

leadSchema.index({ user: 1, createdAt: -1 });
leadSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Lead", leadSchema);
module.exports.LEAD_STATUSES = LEAD_STATUSES;
