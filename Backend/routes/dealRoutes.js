const express = require("express");
const { getDeals, getDealById, createDeal, updateDeal, deleteDeal } = require("../controller/dealController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.route("/").get(protect, getDeals).post(protect, createDeal);
router.route("/:id").get(protect, getDealById).put(protect, updateDeal).delete(protect, deleteDeal);
module.exports = router;
