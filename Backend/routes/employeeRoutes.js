const express = require('express');
const { getMyEmployee, updateMyEmployee, getEmployees, getEmployeesWithoutUser, createEmployee, updateEmployee, deleteEmployee } = require('../controller/employeeController.js');
const { protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();
router.get('/me', protect, getMyEmployee);
router.put('/me', protect, updateMyEmployee);
router.get('/without-user', protect, getEmployeesWithoutUser);
router.route('/').get(protect, getEmployees).post(protect, createEmployee);
router.route('/:id').put(protect, updateEmployee).delete(protect, deleteEmployee);
module.exports = router;
