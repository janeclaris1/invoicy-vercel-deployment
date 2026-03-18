const express = require("express");
const { protect } = require("../middlewares/authMiddleware.js");
const {
  submitInvoice,
  getTinDetails,
  getGhanaCardDetails,
  graInvoice,
  graCancellation,
  graNote,
  graStatementOfAccount,
  graHealth,
  graInventory,
  graInvoiceCallback,
} = require("../controller/graController.js");

const router = express.Router();

// Backwards-compatible app-specific helpers
router.post("/submit-invoice", protect, submitInvoice);
router.get("/tin-details/:tin", protect, getTinDetails);
router.get("/ghana-card-details/:nationalId", protect, getGhanaCardDetails);

// GRA E‑VAT API (VER 8.2) endpoints (proxy)
router.post("/invoice", protect, graInvoice);
router.post("/cancellation", protect, graCancellation);
router.post("/note", protect, graNote);
router.post("/statement-of-account", protect, graStatementOfAccount);
router.get("/health", protect, graHealth);
router.post("/inventory", protect, graInventory);
router.post("/invoice-callback", protect, graInvoiceCallback);

module.exports = router;
