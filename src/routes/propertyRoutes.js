const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireSeller } = require('../middleware/roleCheck');
const { propertyValidation } = require('../middleware/validation');

router.get('/', propertyController.getProperties);
router.get('/featured', propertyController.getFeaturedProperties);
router.get('/:id', propertyController.getPropertyById);
router.post('/:id/view', optionalAuth, propertyController.trackPropertyView);
router.post('/', authenticate, requireSeller, propertyValidation.create, propertyController.createProperty);
router.put('/:id', authenticate, propertyController.updateProperty);
router.patch('/:id/status', authenticate, requireSeller, propertyController.updatePropertyStatus);
router.delete('/:id', authenticate, propertyController.deleteProperty);

module.exports = router;
