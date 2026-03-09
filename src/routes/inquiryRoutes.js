const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { authenticate } = require('../middleware/auth');
const { inquiryValidation } = require('../middleware/validation');

router.post('/', authenticate, inquiryValidation.send, inquiryController.sendInquiry);
router.get('/', authenticate, inquiryController.getInquiries);
router.patch('/:id', authenticate, inquiryController.updateInquiry);

module.exports = router;
