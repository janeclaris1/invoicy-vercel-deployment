const express = require('express');
const { registerUser, loginUser, getMe, updateUserProfile, getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, getAllClients, forgotPassword, resetPassword } = require('../controller/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validateRegister, validateLogin } = require('../middlewares/validator');

const router = express.Router();

router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.route('/me').get(protect, getMe).put(protect, updateUserProfile);
router.route('/team').get(protect, getTeamMembers).post(protect, createTeamMember);
router.route('/team/:id').put(protect, updateTeamMember).delete(protect, deleteTeamMember);
router.get('/clients', protect, getAllClients);

module.exports = router; 

