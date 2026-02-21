const express = require('express');
const {
  getPayrollRecords,
  getMyPayrollRecords,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
} = require('../controller/payrollController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Self-service route (must come before /:id)
router.get('/me', protect, getMyPayrollRecords);

// Admin/HR routes
router.route('/')
  .get(protect, getPayrollRecords)
  .post(protect, createPayrollRecord);

router.route('/:id')
  .put(protect, updatePayrollRecord)
  .delete(protect, deletePayrollRecord);

module.exports = router;
