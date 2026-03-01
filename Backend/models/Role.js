/**
 * Role — named role with optional permission set.
 * If permissions array is empty, fallback to legacy user.role (owner/admin/staff/viewer) in middleware.
 */
const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

roleSchema.index({ code: 1 });

module.exports = mongoose.model("Role", roleSchema);
