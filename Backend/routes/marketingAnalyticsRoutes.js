const express = require("express");
const { getAnalytics } = require("../controller/marketingAnalyticsController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.get("/", protect, getAnalytics);
module.exports = router;
