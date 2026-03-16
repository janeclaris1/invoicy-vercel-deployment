const express = require("express");
const { getLeads, getLeadById, createLead, updateLead, deleteLead } = require("../controller/leadController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlan } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlan("pro"));
router.route("/").get(getLeads).post(createLead);
router.route("/:id").get(getLeadById).put(updateLead).delete(deleteLead);
module.exports = router;
