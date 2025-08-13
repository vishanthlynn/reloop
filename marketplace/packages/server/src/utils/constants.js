// User roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// Product categories
const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  FURNITURE: 'furniture',
  CLOTHING: 'clothing',
  TICKETS: 'tickets',
  BOOKS: 'books',
  SPORTS: 'sports',
  AUTOMOTIVE: 'automotive',
  HOME_GARDEN: 'home_garden',
  JEWELRY: 'jewelry',
  OTHER: 'other'
};

// Product conditions
const PRODUCT_CONDITIONS = {
  NEW: 'new',
  LIKE_NEW: 'like_new',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor'
};

// Listing types
const LISTING_TYPES = {
  FIXED_PRICE: 'fixed_price',
  AUCTION: 'auction'
};

// Order statuses
const ORDER_STATUSES = {
  PENDING: 'pending',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed'
};

// Payment methods
const PAYMENT_METHODS = {
  UPI: 'upi',
  CARD: 'card',
  WALLET: 'wallet',
  COD: 'cod'
};

// Auction statuses
const AUCTION_STATUSES = {
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled'
};

// Chat message types
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  SYSTEM: 'system'
};

// Notification types
const NOTIFICATION_TYPES = {
  ORDER_UPDATE: 'order_update',
  AUCTION_UPDATE: 'auction_update',
  PRICE_DROP: 'price_drop',
  NEW_MESSAGE: 'new_message',
  REVIEW_REQUEST: 'review_request'
};

// KYC status
const KYC_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

module.exports = {
  USER_ROLES,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  LISTING_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  AUCTION_STATUSES,
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  KYC_STATUS
};
