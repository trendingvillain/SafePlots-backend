const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');

router.post('/register', authValidation.register, authController.register);
router.post('/verify-otp', authValidation.verifyOtp, authController.verifyOTP);
router.post('/send-otp', authValidation.forgotPassword, authController.sendOTP);
router.post('/login', authValidation.login, authController.login);
router.post('/google', authController.googleLogin);
router.post('/google-register', authController.googleRegister);
router.post('/forgot-password', authValidation.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidation.resetPassword, authController.resetPassword);
router.post('/change-password', authenticate, authValidation.changePassword, authController.changePassword);

module.exports = router;
