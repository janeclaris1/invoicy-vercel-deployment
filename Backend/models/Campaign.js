const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["email", "promo", "ad"],
      default: "email",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "cancelled"],
      default: "draft",
    },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    targetSegment: { type: String, default: "all" },
    listId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingList", default: null },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailTemplate", default: null },
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

campaignSchema.index({ user: 1, createdAt: -1 });
campaignSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);
