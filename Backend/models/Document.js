/**
 * Document — store references to files (e.g. base64 or storage key) linked to entities.
 * For full document management, replace content with storageRef (S3/key) and add signed URLs.
 */
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    storageRef: { type: String, default: "" },
    content: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

documentSchema.index({ user: 1, entityType: 1, entityId: 1 });
documentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
