import { Order } from '../../models/order.model.js';
import { Product } from '../../models/product.model.js';
import { User } from '../../models/user.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { paymentService } from '../../services/payment.service.js';
import { shippingService } from '../../services/shipping.service.js';

// Create new order
export const createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity, shippingAddress, paymentMethod } = req.body;
  const buyerId = req.user._id;

  // Validate product
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (product.status !== 'available') {
    throw new ApiError(400, 'Product is not available');
  }

  if (product.quantity < quantity) {
    throw new ApiError(400, 'Insufficient product quantity');
  }

  // Calculate total amount
  const totalAmount = product.price * quantity;
  const platformFee = totalAmount * 0.05; // 5% platform commission
  const sellerAmount = totalAmount - platformFee;

  // Create order
  const order = await Order.create({
    buyer: buyerId,
    seller: product.seller,
    product: productId,
    quantity,
    totalAmount,
    platformFee,
    sellerAmount,
    shippingAddress,
    paymentMethod,
    status: 'pending',
    paymentStatus: 'pending'
  });

  // Initialize payment
  if (paymentMethod !== 'cod') {
    const paymentIntent = await paymentService.createPaymentIntent({
      amount: totalAmount,
      orderId: order._id,
      customerId: buyerId
    });
    
    order.paymentIntentId = paymentIntent.id;
    await order.save();
  }

  // Update product quantity
  product.quantity -= quantity;
  if (product.quantity === 0) {
    product.status = 'sold';
  }
  await product.save();

  res.status(201).json(
    new ApiResponse(201, order, 'Order created successfully')
  );
});

// Get order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId)
    .populate('buyer', 'name email phone')
    .populate('seller', 'name email phone')
    .populate('product');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if user is buyer or seller
  if (order.buyer._id.toString() !== userId.toString() && 
      order.seller._id.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to view this order');
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Order fetched successfully')
  );
});

// Get user orders
export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { type = 'buyer', status, page = 1, limit = 10 } = req.query;

  const query = {};
  if (type === 'buyer') {
    query.buyer = userId;
  } else {
    query.seller = userId;
  }

  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('product', 'title images price')
    .populate(type === 'buyer' ? 'seller' : 'buyer', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, 'Orders fetched successfully')
  );
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, trackingNumber } = req.body;
  const userId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Only seller can update certain statuses
  if (order.seller.toString() !== userId.toString()) {
    throw new ApiError(403, 'Only seller can update order status');
  }

  const allowedTransitions = {
    'pending': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
  };

  if (!allowedTransitions[order.status]?.includes(status)) {
    throw new ApiError(400, 'Invalid status transition');
  }

  order.status = status;

  // Handle shipping
  if (status === 'shipped' && trackingNumber) {
    order.trackingNumber = trackingNumber;
    order.shippedAt = new Date();
    
    // Create shipping with courier API
    const shipping = await shippingService.createShipment({
      orderId: order._id,
      trackingNumber,
      courier: req.body.courier || 'shiprocket'
    });
    
    order.shippingId = shipping.id;
  }

  // Handle delivery confirmation
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    order.paymentStatus = 'completed';
    
    // Release payment from escrow to seller
    if (order.paymentMethod !== 'cod') {
      await paymentService.releasePayment({
        orderId: order._id,
        sellerId: order.seller,
        amount: order.sellerAmount
      });
    }
  }

  // Handle cancellation
  if (status === 'cancelled') {
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason;
    
    // Refund payment if already paid
    if (order.paymentStatus === 'completed') {
      await paymentService.refund({
        orderId: order._id,
        amount: order.totalAmount
      });
      order.paymentStatus = 'refunded';
    }
    
    // Restore product quantity
    const product = await Product.findById(order.product);
    product.quantity += order.quantity;
    if (product.status === 'sold') {
      product.status = 'available';
    }
    await product.save();
  }

  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Order status updated successfully')
  );
});

// Confirm payment
export const confirmPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Verify payment with payment gateway
  const payment = await paymentService.verifyPayment({
    paymentId,
    orderId: order._id,
    amount: order.totalAmount
  });

  if (!payment.success) {
    throw new ApiError(400, 'Payment verification failed');
  }

  order.paymentStatus = 'completed';
  order.paymentId = paymentId;
  order.paidAt = new Date();
  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Payment confirmed successfully')
  );
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if user is buyer or seller
  if (order.buyer.toString() !== userId.toString() && 
      order.seller.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to cancel this order');
  }

  // Check if order can be cancelled
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new ApiError(400, 'Order cannot be cancelled');
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  order.cancelledBy = userId;

  // Process refund if payment was made
  if (order.paymentStatus === 'completed') {
    await paymentService.refund({
      orderId: order._id,
      amount: order.totalAmount
    });
    order.paymentStatus = 'refunded';
  }

  // Restore product quantity
  const product = await Product.findById(order.product);
  product.quantity += order.quantity;
  if (product.status === 'sold') {
    product.status = 'available';
  }
  await product.save();

  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Order cancelled successfully')
  );
});

// Get order tracking
export const getOrderTracking = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if user is buyer or seller
  if (order.buyer.toString() !== userId.toString() && 
      order.seller.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to track this order');
  }

  if (!order.trackingNumber) {
    throw new ApiError(400, 'Order has not been shipped yet');
  }

  // Get tracking info from courier API
  const tracking = await shippingService.getTracking({
    trackingNumber: order.trackingNumber,
    courier: order.courier || 'shiprocket'
  });

  res.status(200).json(
    new ApiResponse(200, tracking, 'Tracking information fetched successfully')
  );
});

// Initiate dispute
export const initiateDispute = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason, description, evidence } = req.body;
  const userId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Only buyer can initiate dispute
  if (order.buyer.toString() !== userId.toString()) {
    throw new ApiError(403, 'Only buyer can initiate dispute');
  }

  // Check if order is eligible for dispute
  if (!['shipped', 'delivered'].includes(order.status)) {
    throw new ApiError(400, 'Order is not eligible for dispute');
  }

  order.dispute = {
    status: 'open',
    reason,
    description,
    evidence,
    initiatedBy: userId,
    initiatedAt: new Date()
  };

  order.status = 'disputed';
  await order.save();

  // Notify seller and admin
  // TODO: Send notifications

  res.status(200).json(
    new ApiResponse(200, order, 'Dispute initiated successfully')
  );
});

// Resolve dispute
export const resolveDispute = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { resolution, refundAmount } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (!order.dispute || order.dispute.status !== 'open') {
    throw new ApiError(400, 'No active dispute found');
  }

  // Only admin can resolve disputes
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admin can resolve disputes');
  }

  order.dispute.status = 'resolved';
  order.dispute.resolution = resolution;
  order.dispute.resolvedAt = new Date();
  order.dispute.resolvedBy = req.user._id;

  // Process refund if applicable
  if (refundAmount > 0) {
    await paymentService.refund({
      orderId: order._id,
      amount: refundAmount
    });
    order.dispute.refundAmount = refundAmount;
  }

  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Dispute resolved successfully')
  );
});
