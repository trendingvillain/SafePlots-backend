const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const propertyController = require('../controllers/propertyController');
const { authenticate } = require('../middleware/auth');
const { requireSeller } = require('../middleware/roleCheck');

router.post('/register', authenticate, sellerController.registerSeller);
router.get('/profile', authenticate, requireSeller, sellerController.getSellerProfile);
router.get('/stats', authenticate, requireSeller, sellerController.getSellerStats);
router.get('/properties', authenticate, requireSeller, sellerController.getSellerProperties);
router.get('/inquiries', authenticate, requireSeller, sellerController.getSellerInquiries);
router.patch('/inquiries/:id', authenticate, requireSeller, sellerController.updateInquiryStatus);
router.get('/:sellerId/properties', propertyController.getPropertiesBySeller);

module.exports = router;
