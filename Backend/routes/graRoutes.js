const express = require("express");
const { protect } = require("../middlewares/authMiddleware.js");
const { submitInvoice, submitVatReturn, getTinDetails, getGhanaCardDetails } = require("../controller/graController.js");

const router = express.Router();

router.post("/submit-invoice", protect, submitInvoice);
router.post("/submit-vat-return", protect, submitVatReturn);
router.get("/tin-details/:tin", protect, getTinDetails);
router.get("/ghana-card-details/:nationalId", protect, getGhanaCardDetails);

module.exports = router;
