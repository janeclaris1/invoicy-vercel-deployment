const express = require("express");
const { getActivities, getActivityById, createActivity, updateActivity, deleteActivity } = require("../controller/activityController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlan } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlan("pro"));
router.route("/").get(getActivities).post(createActivity);
router.route("/:id").get(getActivityById).put(updateActivity).delete(deleteActivity);
module.exports = router;
