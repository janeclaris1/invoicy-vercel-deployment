const express = require("express");
const { getReports } = require("../controller/crmReportsController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlan } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlan("pro"));
router.get("/", getReports);
module.exports = router;
