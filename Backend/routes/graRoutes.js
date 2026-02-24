const express = require("express");
const { protect } = require("../middlewares/authMiddleware.js");
const { submitInvoice, submitVatReturn } = require("../controller/graController.js");

const router = express.Router();

router.post("/submit-invoice", protect, submitInvoice);
router.post("/submit-vat-return", protect, submitVatReturn);

module.exports = router;
