const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/permissionMiddleware");
const {
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  assignRolesToUser,
} = require("../controller/permissionController");

const router = express.Router();
router.use(protect);
const adminOnly = requireRole("owner", "admin");

router.get("/permissions", listPermissions);
router.get("/roles", listRoles);
router.post("/roles", adminOnly, createRole);
router.put("/roles/:id", adminOnly, updateRole);
router.put("/users/:id/roles", adminOnly, assignRolesToUser);

module.exports = router;
