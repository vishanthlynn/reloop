const mongoose = require('mongoose');
const { ORDER_STATUSES, PAYMENT_METHODS } = require('../utils/constants');

const orderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Parties
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productSnapshot: {
    title: String,
    price: Number,
    images: [String],
    category: String
  },
  
  // Pricing
  itemPrice: {
    type: Number,
    required: true,
    min: [1, 'Item price must be at least ₹1']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  platformFee: {
    type: Number,
    required: true,
    min: [0, 'Platform fee cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [1, 'Total amount must be at least ₹1']
  },
  
  // Payment
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: Object.values(PAYMENT_METHODS)
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String,
    gatewayResponse: Object
  },
  
  // Escrow
  escrow: {
    isEscrowEnabled: { type: Boolean, default: true },
    escrowAmount: Number,
    escrowReleaseDate: Date,
    isReleased: { type: Boolean, default: false },
    releasedAt: Date,
    holdReason: String
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(ORDER_STATUSES),
    default: ORDER_STATUSES.PENDING
  },
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES)
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Shipping Information
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String
  },
  
  // Shipping Details
  shipping: {
    courierPartner: String,
    trackingNumber: String,
    awbNumber: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date,
    deliveryAttempts: { type: Number, default: 0 },
    deliveryNotes: String
  },
  
  // Communication
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isSystemMessage: { type: Boolean, default: false }
  }],
  
  // Dispute & Returns
  dispute: {
    isDisputed: { type: Boolean, default: false },
    disputeReason: String,
    disputeDetails: String,
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    disputedAt: Date,
    resolution: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  returnRequest: {
    isRequested: { type: Boolean, default: false },
    reason: String,
    details: String,
    requestedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed']
    }
  },
  
  // Reviews
  buyerReview: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    reviewedAt: Date
  },
  sellerReview: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    reviewedAt: Date
  },
  
  // Timestamps
  placedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceInfo: Object
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ product: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'shipping.trackingNumber': 1 });
orderSchema.index({ placedAt: -1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `MP${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware to update status history
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Date.now() - this.placedAt;
});

// Instance method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = [ORDER_STATUSES.PENDING, ORDER_STATUSES.PAYMENT_PENDING, ORDER_STATUSES.PAID];
  return cancellableStatuses.includes(this.status);
};

// Instance method to check if order can be returned
orderSchema.methods.canBeReturned = function() {
  const returnableStatuses = [ORDER_STATUSES.DELIVERED];
  const daysSinceDelivery = this.shipping.deliveredAt ? 
    (Date.now() - this.shipping.deliveredAt) / (1000 * 60 * 60 * 24) : 0;
  
  return returnableStatuses.includes(this.status) && daysSinceDelivery <= 7;
};

// Transform output
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);
