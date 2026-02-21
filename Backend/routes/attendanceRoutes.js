const express = require('express');
const { getAttendance, upsertAttendance, deleteAttendance } = require('../controller/attendanceController.js');
const { protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();
router.route('/').get(protect, getAttendance).post(protect, upsertAttendance);
router.route('/:id').delete(protect, deleteAttendance);
module.exports = router;
