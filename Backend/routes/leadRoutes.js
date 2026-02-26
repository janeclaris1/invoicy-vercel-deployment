const express = require("express");
const { getLeads, getLeadById, createLead, updateLead, deleteLead } = require("../controller/leadController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.route("/").get(protect, getLeads).post(protect, createLead);
router.route("/:id").get(protect, getLeadById).put(protect, updateLead).delete(protect, deleteLead);
module.exports = router;
