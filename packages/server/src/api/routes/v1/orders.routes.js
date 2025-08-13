import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  confirmPayment,
  cancelOrder,
  getOrderTracking,
  initiateDispute,
  resolveDispute
} from '../../controllers/order.controller.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import {
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateMongoId,
  validatePagination,
  validatePaymentConfirmation,
  validateInitiateDispute
} from '../../middlewares/validator.middleware.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Create new order
router.post(
  '/',
  validateCreateOrder,
  createOrder
);

// Get user orders (as buyer or seller)
router.get(
  '/my-orders',
  validatePagination,
  getUserOrders
);

// Get specific order
router.get(
  '/:orderId',
  validateMongoId('orderId'),
  getOrderById
);

// Update order status (seller only)
router.patch(
  '/:orderId/status',
  validateUpdateOrderStatus,
  updateOrderStatus
);

// Confirm payment
router.post(
  '/:orderId/confirm-payment',
  validatePaymentConfirmation,
  confirmPayment
);

// Cancel order
router.post(
  '/:orderId/cancel',
  validateMongoId('orderId'),
  cancelOrder
);

// Get order tracking
router.get(
  '/:orderId/tracking',
  validateMongoId('orderId'),
  getOrderTracking
);

// Dispute management
router.post(
  '/:orderId/dispute',
  validateInitiateDispute,
  initiateDispute
);

router.patch(
  '/:orderId/dispute/resolve',
  validateMongoId('orderId'),
  resolveDispute
);

export default router;
