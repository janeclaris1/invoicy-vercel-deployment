/**
 * Audit middleware — writes an audit log entry for the current request.
 * Use after successful mutation; pass resource, resourceId, action, and optional changes.
 * Does not block the request; log failures are caught and reported to logger only.
 */
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

/**
 * Create an audit log entry (fire-and-forget). Safe to call from route handlers or other middleware.
 * @param {Object} opts - { userId, userEmail, action, resource, resourceId, description, changes, req }
 */
const audit = async (opts) => {
  const {
    userId,
    userEmail,
    action,
    resource,
    resourceId = "",
    description = "",
    changes = null,
    req = null,
    success = true,
  } = opts || {};
  try {
    const metadata = {};
    if (req) {
      metadata.ip = (req.headers && req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"].split(",")[0].trim() : (req.connection && req.connection.remoteAddress) || "";
      metadata.userAgent = (req.headers && req.headers["user-agent"]) || "";
    }
    await AuditLog.create({
      userId: userId || null,
      userEmail: userEmail || "",
      action: action || "unknown",
      resource: resource || "Unknown",
      resourceId: String(resourceId),
      description,
      changes: changes || null,
      metadata: Object.keys(metadata).length ? metadata : null,
      ip: metadata.ip || "",
      userAgent: metadata.userAgent || "",
      success: !!success,
    });
  } catch (err) {
    logger.error("Audit log write failed", { error: err.message, resource, action });
  }
};

/**
 * Middleware that attaches a helper to req so routes can log: req.auditLog({ action, resource, resourceId, changes }).
 */
const attachAudit = (req, res, next) => {
  req.auditLog = (opts) => {
    const user = req.user;
    audit({
      ...opts,
      userId: user && user._id,
      userEmail: user && user.email,
      req,
    });
  };
  next();
};

module.exports = { audit, attachAudit };
