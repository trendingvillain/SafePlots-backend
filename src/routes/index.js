const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const propertyRoutes = require('./propertyRoutes');
const userRoutes = require('./userRoutes');
const sellerRoutes = require('./sellerRoutes');
const inquiryRoutes = require('./inquiryRoutes');
const reportRoutes = require('./reportRoutes');
const adminRoutes = require('./adminRoutes');

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/users', userRoutes);
router.use('/sellers', sellerRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SafePlots API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
