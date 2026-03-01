/**
 * Seed default permissions for ERP RBAC.
 * Run once: node scripts/seedPermissions.js
 * Requires MONGODB_URI or default connection.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Permission = require("../models/Permission");

const DEFAULT_PERMISSIONS = [
  { code: "invoices:read", name: "View invoices", resource: "invoices", action: "read" },
  { code: "invoices:create", name: "Create invoices", resource: "invoices", action: "create" },
  { code: "invoices:update", name: "Edit invoices", resource: "invoices", action: "update" },
  { code: "invoices:delete", name: "Delete invoices", resource: "invoices", action: "delete" },
  { code: "reports:read", name: "View reports", resource: "reports", action: "read" },
  { code: "accounting:read", name: "View accounting", resource: "accounting", action: "read" },
  { code: "accounting:post", name: "Post to GL", resource: "accounting", action: "post" },
  { code: "audit:read", name: "View audit logs", resource: "audit", action: "read" },
  { code: "employees:read", name: "View employees", resource: "employees", action: "read" },
  { code: "employees:update", name: "Edit employees", resource: "employees", action: "update" },
  { code: "settings:read", name: "View settings", resource: "settings", action: "read" },
  { code: "settings:update", name: "Update settings", resource: "settings", action: "update" },
];

const run = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/invoicy";
    await mongoose.connect(uri);
    for (const p of DEFAULT_PERMISSIONS) {
      await Permission.findOneAndUpdate(
        { code: p.code },
        { $setOnInsert: { ...p, isSystem: true } },
        { upsert: true }
      );
    }
    console.log("Seeded", DEFAULT_PERMISSIONS.length, "permissions");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
