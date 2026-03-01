/**
 * Permission — fine-grained permission for RBAC/ABAC.
 * Format: resource:action (e.g. invoices:create, reports:read).
 * Scope can be own | branch | all (enforced in middleware).
 */
const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    resource: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    scope: { type: String, enum: ["own", "branch", "all"], default: "all" },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

permissionSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model("Permission", permissionSchema);
