const mongoose = require("mongoose");

const DEAL_STAGES = ["qualification", "proposal", "negotiation", "won", "lost"];

const dealSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    name: { type: String, required: true, trim: true },
    value: { type: Number, default: 0 },
    currency: { type: String, default: "GHS", trim: true },
    stage: { type: String, enum: DEAL_STAGES, default: "qualification" },
    expectedCloseDate: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

dealSchema.index({ user: 1, createdAt: -1 });
dealSchema.index({ user: 1, stage: 1 });

module.exports = mongoose.model("Deal", dealSchema);
module.exports.DEAL_STAGES = DEAL_STAGES;
