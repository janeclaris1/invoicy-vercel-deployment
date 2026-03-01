const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/permissionMiddleware");
const {
  listDefinitions,
  createDefinition,
  getValues,
  setValues,
} = require("../controller/customFieldsController");

const router = express.Router();
router.use(protect);

router.get("/definitions", listDefinitions);
router.post("/definitions", requireRole("owner", "admin"), createDefinition);
router.get("/values/:entityType/:entityId", getValues);
router.put("/values/:entityType/:entityId", setValues);

module.exports = router;
