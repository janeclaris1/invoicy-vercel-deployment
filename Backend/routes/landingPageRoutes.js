const express = require("express");
const {
  getLandingPages,
  getLandingPageById,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
} = require("../controller/landingPageController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getLandingPages).post(protect, createLandingPage);
router.route("/:id").get(protect, getLandingPageById).put(protect, updateLandingPage).delete(protect, deleteLandingPage);

module.exports = router;
