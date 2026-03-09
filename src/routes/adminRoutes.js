const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id/ban', adminController.banUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/sellers', adminController.getAllSellers);
router.get('/sellers/:id', adminController.getSellerDetails);
router.post('/sellers/:id/approve', adminController.approveSeller);
router.post('/sellers/:id/reject', adminController.rejectSeller);
router.get('/properties', adminController.getAllProperties);
router.get('/properties/:id', adminController.getPropertyDetails);
router.put('/properties/:id', adminController.updatePropertyAdmin);
router.post('/properties/:id/approve', adminController.approveProperty);
router.post('/properties/:id/reject', adminController.rejectProperty);
router.post('/properties/:id/suspend', adminController.suspendProperty);
router.get('/reports', adminController.getAllReports);
router.patch('/reports/:id', adminController.takeReportAction);
router.get('/activities', adminController.getUserActivities);

module.exports = router;
