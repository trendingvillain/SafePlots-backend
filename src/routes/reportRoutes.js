const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const { reportValidation } = require('../middleware/validation');

router.post('/', authenticate, reportValidation.create, reportController.createReport);
router.get('/', authenticate, requireAdmin, reportController.getReports);
router.patch('/:id', authenticate, requireAdmin, reportController.updateReport);

module.exports = router;
