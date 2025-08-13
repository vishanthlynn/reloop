import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from '../../utils/ApiError.js';

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new ApiError(400, 'Validation failed', errorMessages);
  }
  next();
};

// Auth validations
export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian mobile number is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors
];

export const validateLogin = [
  body('emailOrPhone').notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

export const validateOTP = [
  body('phone').isMobilePhone('en-IN').withMessage('Valid phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  handleValidationErrors
];

// Product validations
export const validateCreateProduct = [
  body('title').trim().notEmpty().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3-100 characters'),
  body('description').trim().notEmpty().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10-2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('condition').isIn(['new', 'like-new', 'good', 'fair', 'poor']).withMessage('Invalid condition'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('saleType').isIn(['fixed', 'auction']).withMessage('Sale type must be fixed or auction'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('location.state').notEmpty().withMessage('State is required'),
  body('location.pincode').matches(/^[1-9][0-9]{5}$/).withMessage('Valid 6-digit pincode required'),
  handleValidationErrors
];

export const validateUpdateProduct = [
  param('productId').isMongoId().withMessage('Invalid product ID'),
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3-100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10-2000 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  handleValidationErrors
];

export const validateProductQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('category').optional().notEmpty().withMessage('Category cannot be empty'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
  query('condition').optional().isIn(['new', 'like-new', 'good', 'fair', 'poor']).withMessage('Invalid condition'),
  query('saleType').optional().isIn(['fixed', 'auction']).withMessage('Invalid sale type'),
  query('sort').optional().isIn(['price', '-price', 'createdAt', '-createdAt', 'views', '-views']).withMessage('Invalid sort option'),
  handleValidationErrors
];

// Order validations
export const validateCreateOrder = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').isMobilePhone('en-IN').withMessage('Valid phone number required'),
  body('shippingAddress.addressLine1').notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').matches(/^[1-9][0-9]{5}$/).withMessage('Valid 6-digit pincode required'),
  body('paymentMethod').isIn(['card', 'upi', 'wallet', 'cod']).withMessage('Invalid payment method'),
  handleValidationErrors
];

export const validateUpdateOrderStatus = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('status').isIn(['processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('trackingNumber').optional().notEmpty().withMessage('Tracking number cannot be empty'),
  body('courier').optional().isIn(['shiprocket', 'delhivery', 'bluedart', 'dtdc']).withMessage('Invalid courier'),
  handleValidationErrors
];

// Review validations
export const validateCreateReview = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters'),
  body('reviewType').isIn(['product', 'seller', 'buyer']).withMessage('Invalid review type'),
  handleValidationErrors
];

export const validateUpdateReview = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters'),
  handleValidationErrors
];

// Bid validations (for auctions)
export const validatePlaceBid = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Bid amount must be positive'),
  handleValidationErrors
];

// Chat validations
export const validateSendMessage = [
  body('receiverId').isMongoId().withMessage('Invalid receiver ID'),
  body('productId').optional().isMongoId().withMessage('Invalid product ID'),
  body('message').trim().notEmpty().isLength({ max: 1000 }).withMessage('Message must not exceed 1000 characters'),
  handleValidationErrors
];

// KYC validations
export const validateKYC = [
  body('documentType').isIn(['aadhaar', 'pan', 'passport', 'driving_license']).withMessage('Invalid document type'),
  body('documentNumber').notEmpty().withMessage('Document number is required'),
  body('documentFront').notEmpty().withMessage('Document front image is required'),
  body('documentBack').optional().notEmpty().withMessage('Document back image cannot be empty'),
  body('selfie').notEmpty().withMessage('Selfie is required'),
  handleValidationErrors
];

// User profile validations
export const validateUpdateProfile = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid phone number required'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date required'),
  body('pincode').optional().matches(/^[1-9][0-9]{5}$/).withMessage('Valid 6-digit pincode required'),
  handleValidationErrors
];

// Payment validations
export const validatePaymentConfirmation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('signature').optional().notEmpty().withMessage('Payment signature is required'),
  handleValidationErrors
];

// Dispute validations
export const validateInitiateDispute = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('reason').isIn(['not_received', 'damaged', 'wrong_item', 'not_as_described', 'other']).withMessage('Invalid dispute reason'),
  body('description').trim().notEmpty().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10-1000 characters'),
  body('evidence').optional().isArray().withMessage('Evidence must be an array of URLs'),
  handleValidationErrors
];

// Report validations
export const validateReport = [
  body('targetType').isIn(['product', 'user', 'review']).withMessage('Invalid target type'),
  body('targetId').isMongoId().withMessage('Invalid target ID'),
  body('reason').isIn(['spam', 'fake', 'inappropriate', 'scam', 'other']).withMessage('Invalid report reason'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1-100'),
  handleValidationErrors
];

// MongoDB ID validation
export const validateMongoId = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];
