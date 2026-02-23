const express = require('express');
const { initializePayment, getMySubscription, initializeGuestPayment, webhook } = require('../controller/subscriptionController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/me', protect, getMySubscription);
router.post('/initialize', protect, initializePayment);
router.post('/initialize-guest', initializeGuestPayment);

module.exports = router;
module.exports.webhook = webhook;
