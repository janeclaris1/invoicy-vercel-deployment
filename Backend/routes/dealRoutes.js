const express = require("express");
const { getDeals, getDealById, createDeal, updateDeal, deleteDeal } = require("../controller/dealController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlanPermission } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlanPermission("crm.deals"));
router.route("/").get(getDeals).post(createDeal);
router.route("/:id").get(getDealById).put(updateDeal).delete(deleteDeal);
module.exports = router;
