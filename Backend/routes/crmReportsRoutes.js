const express = require("express");
const { getReports } = require("../controller/crmReportsController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlanPermission } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlanPermission("crm.reports"));
router.get("/", getReports);
module.exports = router;
