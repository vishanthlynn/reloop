import mongoose from 'mongoose';
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, LISTING_TYPES, AUCTION_STATUSES } from '../utils/constants.js';

const productSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: Object.values(PRODUCT_CATEGORIES)
  },
  subcategory: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    required: [true, 'Product condition is required'],
    enum: Object.values(PRODUCT_CONDITIONS)
  },
  
  // Images
  images: [{
    public_id: { type: String, required: true },
    url: { type: String, required: true },
    isMain: { type: Boolean, default: false }
  }],
  
  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Listing Type
  listingType: {
    type: String,
    required: [true, 'Listing type is required'],
    enum: Object.values(LISTING_TYPES)
  },
  
  // Fixed Price Details
  price: {
    type: Number,
    required: function() {
      return this.listingType === LISTING_TYPES.FIXED_PRICE;
    },
    min: [1, 'Price must be at least ₹1']
  },
  originalPrice: {
    type: Number,
    min: [1, 'Original price must be at least ₹1']
  },
  
  // Auction Details
  auction: {
    startingBid: {
      type: Number,
      required: function() {
        return this.listingType === LISTING_TYPES.AUCTION;
      },
      min: [1, 'Starting bid must be at least ₹1']
    },
    currentBid: {
      type: Number,
      default: 0
    },
    bidIncrement: {
      type: Number,
      default: 10,
      min: [1, 'Bid increment must be at least ₹1']
    },
    reservePrice: {
      type: Number,
      min: [1, 'Reserve price must be at least ₹1']
    },
    startTime: {
      type: Date,
      required: function() {
        return this.listingType === LISTING_TYPES.AUCTION;
      }
    },
    endTime: {
      type: Date,
      required: function() {
        return this.listingType === LISTING_TYPES.AUCTION;
      }
    },
    status: {
      type: String,
      enum: Object.values(AUCTION_STATUSES),
      default: AUCTION_STATUSES.ACTIVE
    },
    totalBids: {
      type: Number,
      default: 0
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Location
  location: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true, match: [/^\d{6}$/, 'Invalid pincode'] },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Specifications (flexible for different categories)
  specifications: {
    type: Map,
    of: String
  },
  
  // Status & Visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isSold: {
    type: Boolean,
    default: false
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  soldAt: Date,
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String,
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  
  // AI Generated Data
  aiTags: [String],
  aiSuggestedPrice: {
    min: Number,
    max: Number,
    confidence: Number
  },
  scamScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Shipping
  shippingOptions: {
    freeShipping: { type: Boolean, default: false },
    shippingCost: { type: Number, min: 0 },
    estimatedDelivery: String,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number
    }
  },
  
  // Boost/Promotion
  boostedUntil: Date,
  promotionType: {
    type: String,
    enum: ['none', 'featured', 'top_search', 'category_featured']
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ seller: 1 });
productSchema.index({ category: 1 });
productSchema.index({ listingType: 1 });
productSchema.index({ isActive: 1, isApproved: 1 });
productSchema.index({ 'location.city': 1, 'location.state': 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'auction.endTime': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ views: -1 });
productSchema.index({ title: 'text', description: 'text' });

// Compound indexes
productSchema.index({ category: 1, price: 1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isApproved: 1, isSold: 1 });

// Virtual for auction time remaining
productSchema.virtual('auctionTimeRemaining').get(function() {
  if (this.listingType === LISTING_TYPES.AUCTION && this.auction.endTime) {
    const now = new Date();
    const timeRemaining = this.auction.endTime - now;
    return Math.max(0, timeRemaining);
  }
  return 0;
});

// Virtual for auction status
productSchema.virtual('isAuctionActive').get(function() {
  if (this.listingType === LISTING_TYPES.AUCTION) {
    const now = new Date();
    return now >= this.auction.startTime && now < this.auction.endTime && this.auction.status === AUCTION_STATUSES.ACTIVE;
  }
  return false;
});

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Set main image if none exists
  if (this.images.length > 0 && !this.images.some(img => img.isMain)) {
    this.images[0].isMain = true;
  }
  
  // Set current bid to starting bid if it's a new auction
  if (this.listingType === LISTING_TYPES.AUCTION && this.isNew && this.auction.currentBid === 0) {
    this.auction.currentBid = this.auction.startingBid;
  }
  
  next();
});

// Transform output
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export const Product = mongoose.model('Product', productSchema);
