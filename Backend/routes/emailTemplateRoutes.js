const express = require("express");
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
} = require("../controller/emailTemplateController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getTemplates).post(protect, createTemplate);
router.post("/seed-defaults", protect, seedDefaultTemplates);
router.route("/:id").get(protect, getTemplateById).put(protect, updateTemplate).delete(protect, deleteTemplate);

module.exports = router;
