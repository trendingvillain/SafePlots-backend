const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.get('/stats', authenticate, userController.getStats);
router.get('/saved-properties', authenticate, userController.getSavedProperties);
router.post('/saved-properties/:propertyId', authenticate, userController.saveProperty);
router.delete('/saved-properties/:propertyId', authenticate, userController.unsaveProperty);
router.get('/viewed-properties', authenticate, userController.getViewedProperties);
router.get('/inquiries', authenticate, userController.getUserInquiries);

module.exports = router;
