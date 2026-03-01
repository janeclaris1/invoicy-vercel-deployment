/**
 * AuditLog — ERP-grade audit trail for compliance (SOX, GDPR, etc.)
 * Logs who did what, when, to which resource, with optional change diff.
 */
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceId: { type: String, default: "" },
    description: { type: String, default: "" },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, resource: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
