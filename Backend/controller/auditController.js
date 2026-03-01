/**
 * Audit log API — query audit trail (compliance / admin).
 * All endpoints require auth; list/export restricted by permission (e.g. audit:read or admin).
 */
const AuditLog = require("../models/AuditLog");

const list = async (req, res) => {
  try {
    const { resource, resourceId, userId, action, from, to, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (resource) filter.resource = resource;
    if (resourceId) filter.resourceId = resourceId;
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const cap = Math.min(Number(limit) || 100, 500);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(cap)
      .lean();
    const total = await AuditLog.countDocuments(filter);
    return res.json({
      data: logs,
      pagination: { page: Number(page), limit: cap, total },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch audit logs" });
  }
};

module.exports = { list };
