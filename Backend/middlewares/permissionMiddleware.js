/**
 * requirePermission — RBAC middleware. Use after protect().
 * requirePermission('invoices:create') or requirePermission(['invoices:create', 'invoices:update'])
 * Legacy: owner and admin bypass. Otherwise check user.roles[].permissions for permission code.
 */
const Permission = require("../models/Permission");
const Role = require("../models/Role");

const getEffectivePermissionCodes = async (user) => {
  if (!user || !user._id) return [];
  if (user.role === "owner" || user.role === "admin") return ["*"];
  const roleIds = (user.roles || []).filter(Boolean);
  if (roleIds.length === 0) return [];
  const roles = await Role.find({ _id: { $in: roleIds } }).populate("permissions", "code").lean();
  const codes = new Set();
  roles.forEach((r) => {
    (r.permissions || []).forEach((p) => p && p.code && codes.add(p.code));
  });
  return Array.from(codes);
};

/**
 * @param {string|string[]} permissionCode - e.g. 'invoices:create' or ['invoices:create', 'invoices:update'] (any match)
 */
const requirePermission = (permissionCode) => {
  const codes = Array.isArray(permissionCode) ? permissionCode : [permissionCode];
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authorized" });
      const effective = await getEffectivePermissionCodes(user);
      if (effective.includes("*")) return next();
      const hasAny = codes.some((c) => effective.includes(c));
      if (hasAny) return next();
      return res.status(403).json({ message: "Insufficient permissions", required: codes });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Permission check failed" });
    }
  };
};

/**
 * requireRole — allow only if user.role is one of the given roles (e.g. owner, admin).
 */
const requireRole = (...roles) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Not authorized" });
  if (roles.includes(user.role)) return next();
  return res.status(403).json({ message: "Insufficient role", required: roles });
};

module.exports = { requirePermission, requireRole, getEffectivePermissionCodes };
