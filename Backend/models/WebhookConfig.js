const mongoose = require("mongoose");

const webhookConfigSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    events: [{ type: String, trim: true }], // e.g. invoice.created, invoice.paid
    secret: { type: String, default: "" }, // for HMAC signing payloads
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

webhookConfigSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("WebhookConfig", webhookConfigSchema);
