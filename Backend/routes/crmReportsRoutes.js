const express = require("express");
const { getReports } = require("../controller/crmReportsController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.get("/", protect, getReports);
module.exports = router;
