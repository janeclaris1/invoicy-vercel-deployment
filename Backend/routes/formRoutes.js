const express = require("express");
const {
  getForms,
  getFormById,
  getFormPublic,
  createForm,
  updateForm,
  deleteForm,
  getSubmissions,
  submitForm,
} = require("../controller/formController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.get("/", protect, getForms);
router.get("/:id/public", getFormPublic);
router.get("/:id/submissions", protect, getSubmissions);
router.get("/:id", protect, getFormById);
router.post("/", protect, createForm);
router.post("/:id/submit", submitForm);
router.put("/:id", protect, updateForm);
router.delete("/:id", protect, deleteForm);
module.exports = router;
