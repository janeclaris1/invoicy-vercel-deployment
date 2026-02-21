const express = require('express');
const {
  getMySalary,
  getSalaries,
  upsertSalary,
  deleteSalary,
} = require('../controller/salaryController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Self-service route (must come before /:id)
router.get('/me', protect, getMySalary);

// Admin/HR routes
router.route('/')
  .get(protect, getSalaries)
  .post(protect, upsertSalary);

router.route('/:id')
  .delete(protect, deleteSalary);

module.exports = router;
