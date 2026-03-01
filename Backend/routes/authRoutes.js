const express = require('express');
const { registerUser, loginUser, logout, getMe, updateUserProfile, getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, getAllClients, removeClient, createPendingSignup, forgotPassword, resetPassword, uploadProfilePicture, getProfilePicture } = require('../controller/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validateRegister, validateLogin } = require('../middlewares/validator');
const uploadProfilePictureMw = require('../middlewares/uploadProfilePicture');

const router = express.Router();

router.post('/register', validateRegister, registerUser);
router.post('/pending-signup', createPendingSignup);
router.post('/login', validateLogin, loginUser);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.route('/me').get(protect, getMe).put(protect, updateUserProfile);
router.post('/me/profile-picture', protect, (req, res, next) => {
  uploadProfilePictureMw(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });
}, uploadProfilePicture);
router.get('/profile-picture/:filename', protect, getProfilePicture);
router.route('/team').get(protect, getTeamMembers).post(protect, createTeamMember);
router.route('/team/:id').put(protect, updateTeamMember).delete(protect, deleteTeamMember);
router.get('/clients', protect, getAllClients);
router.delete('/clients/:id', protect, removeClient);

module.exports = router; 

