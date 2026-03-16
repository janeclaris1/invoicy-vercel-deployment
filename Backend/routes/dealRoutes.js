const express = require("express");
const { getDeals, getDealById, createDeal, updateDeal, deleteDeal } = require("../controller/dealController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlan } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlan("pro"));
router.route("/").get(getDeals).post(createDeal);
router.route("/:id").get(getDealById).put(updateDeal).delete(deleteDeal);
module.exports = router;
