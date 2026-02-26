const mongoose = require("mongoose");

const marketingListSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["static", "dynamic"], default: "static" },
    description: { type: String, default: "" },
    /** For static: array of contact identifiers (email or id). For dynamic: filter conditions. */
    conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
    contactCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

marketingListSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("MarketingList", marketingListSchema);
