const express = require('express');
const { parseInvoiceFromText, parseInvoiceFromImage, generateReminderEmail, generateWhatsAppReminder, getDashboardSummary, generatePolicy, generateDocument, getProjectDocumentQuestions, generateProjectDocument } = require('../controller/aiController');
const {protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();

//Route to parse invoice from text
router.post('/parse-invoice', protect, parseInvoiceFromText);
//Route to parse invoice from image
router.post('/parse-invoice-image', protect, parseInvoiceFromImage);

//Route to generate reminder email
router.post('/generate-reminder', protect, generateReminderEmail);
router.post('/generate-whatsapp-reminder', protect, generateWhatsAppReminder);

//Route to get dashboard summary
router.get('/dashboard-summary', protect, getDashboardSummary);

// Route to generate HR policy from template + answers
router.post('/generate-policy', protect, generatePolicy);

// Route to generate professional documents (projects, production, supply chain)
router.post('/generate-document', protect, generateDocument);

// Project Management documents: questions (wizard) and generate
router.get('/project-document/questions/:documentType', protect, getProjectDocumentQuestions);
router.post('/project-document/generate', protect, generateProjectDocument);

module.exports = router;