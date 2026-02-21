const express = require('express');
const { getLeaveRequests, createLeaveRequest, updateLeaveRequest, deleteLeaveRequest } = require('../controller/leaveRequestController.js');
const { protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();
router.route('/').get(protect, getLeaveRequests).post(protect, createLeaveRequest);
router.route('/:id').put(protect, updateLeaveRequest).delete(protect, deleteLeaveRequest);
module.exports = router;
