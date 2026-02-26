const express = require("express");
const { getActivities, getActivityById, createActivity, updateActivity, deleteActivity } = require("../controller/activityController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.route("/").get(protect, getActivities).post(protect, createActivity);
router.route("/:id").get(protect, getActivityById).put(protect, updateActivity).delete(protect, deleteActivity);
module.exports = router;
