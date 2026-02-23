const express = require('express');
const { parseInvoiceFromText, parseInvoiceFromImage, generateReminderEmail, getDashboardSummary, generatePolicy } = require('../controller/aiController');
const {protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();

//Route to parse invoice from text
router.post('/parse-invoice', protect, parseInvoiceFromText);
//Route to parse invoice from image
router.post('/parse-invoice-image', protect, parseInvoiceFromImage);

//Route to generate reminder email
router.post('/generate-reminder', protect, generateReminderEmail);

//Route to get dashboard summary
router.get('/dashboard-summary', protect, getDashboardSummary);

// Route to generate HR policy from template + answers
router.post('/generate-policy', protect, generatePolicy);

module.exports = router;