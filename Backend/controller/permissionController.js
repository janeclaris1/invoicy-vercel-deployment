/**
 * Permissions and Roles API — list permissions; CRUD roles and assign permissions.
 * Access: admin/owner only for write; read can be broader.
 */
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const User = require("../models/User");

const listPermissions = async (req, res) => {
  try {
    const perms = await Permission.find().sort({ resource: 1, action: 1 }).lean();
    return res.json(perms);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to list permissions" });
  }
};

const listRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("permissions", "code name resource action").lean();
    return res.json(roles);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to list roles" });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, code, description, permissions } = req.body;
    if (!name || !code) return res.status(400).json({ message: "name and code are required" });
    const existing = await Role.findOne({ code: code.trim() });
    if (existing) return res.status(400).json({ message: "Role code already exists" });
    const role = await Role.create({
      name: name.trim(),
      code: code.trim(),
      description: (description || "").trim(),
      permissions: Array.isArray(permissions) ? permissions : [],
      createdBy: req.user._id,
    });
    return res.status(201).json(role);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create role" });
  }
};

const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    const { name, code, description, permissions } = req.body;
    if (name !== undefined) role.name = name.trim();
    if (code !== undefined) role.code = code.trim();
    if (description !== undefined) role.description = description.trim();
    if (Array.isArray(permissions)) role.permissions = permissions;
    await role.save();
    return res.json(role);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update role" });
  }
};

const assignRolesToUser = async (req, res) => {
  try {
    const { roles } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (!Array.isArray(roles)) return res.status(400).json({ message: "roles must be an array" });
    targetUser.roles = roles;
    await targetUser.save();
    return res.json({ roles: targetUser.roles });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to assign roles" });
  }
};

module.exports = {
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  assignRolesToUser,
};
