const mongoose = require("mongoose");

const integrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: String, required: true, trim: true }, // e.g. stripe, quickbooks, sendgrid
    name: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    status: { type: String, enum: ["active", "revoked", "error"], default: "active" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // provider-specific (e.g. account id)
    // Encrypted credential stored by backend (use INTEGRATION_ENCRYPTION_KEY to encrypt before save)
    credentialEncrypted: { type: String, default: null },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

integrationSchema.index({ user: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("Integration", integrationSchema);
