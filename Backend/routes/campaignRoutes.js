const express = require("express");
const { getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign } = require("../controller/campaignController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getCampaigns).post(protect, createCampaign);
router.route("/:id").get(protect, getCampaignById).put(protect, updateCampaign).delete(protect, deleteCampaign);

module.exports = router;
