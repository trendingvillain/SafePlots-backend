const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
   console.log('📥 Incoming request body:', req.body);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      'VALIDATION_ERROR',
      errors.array().map(err => err.msg).join(', '),
      400
    );
  }
  next();
};

const authValidation = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    validate
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],

  verifyOtp: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    validate
  ],

  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    validate
  ],

  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    validate
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
    validate
  ]
};

const propertyValidation = {
  create: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('type')
      .isIn(['plot', 'house', 'flat', 'villa', 'farmland'])
      .withMessage('Invalid property type'),
    body('area').isFloat({ min: 0 }).withMessage('Valid area is required'),
    body('areaUnit')
      .isIn(['sqft', 'sqm', 'acre', 'gunta', 'cent'])
      .withMessage('Invalid area unit'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('pincode').trim().notEmpty().withMessage('Pincode is required'),
    validate
  ]
};

const inquiryValidation = {
  send: [
    body('propertyId').isUUID().withMessage('Valid property ID is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    validate
  ]
};

const reportValidation = {
  create: [
    body('propertyId').isUUID().withMessage('Valid property ID is required'),
    body('reason')
      .isIn(['fraud', 'incorrect_info', 'duplicate', 'sold', 'inappropriate', 'other'])
      .withMessage('Invalid report reason'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    validate
  ]
};

module.exports = {
  validate,
  authValidation,
  propertyValidation,
  inquiryValidation,
  reportValidation
};
