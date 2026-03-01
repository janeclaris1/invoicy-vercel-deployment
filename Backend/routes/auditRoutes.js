const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/permissionMiddleware");
const { list } = require("../controller/auditController");

const router = express.Router();
router.use(protect);
router.use(requireRole("owner", "admin"));

/**
 * GET /api/audit-logs
 * Query params: resource, resourceId, userId, action, from, to, limit, page
 * Access: admin or dedicated audit:read permission (to be enforced when RBAC is extended).
 */
router.get("/", list);

module.exports = router;
