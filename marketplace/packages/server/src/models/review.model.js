const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review Details
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
    trim: true
  },
  
  // Parties
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Context
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Review Type
  reviewType: {
    type: String,
    enum: ['buyer_to_seller', 'seller_to_buyer'],
    required: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: String,
  
  // Response from reviewee
  response: {
    comment: {
      type: String,
      maxlength: [300, 'Response cannot exceed 300 characters']
    },
    respondedAt: Date
  },
  
  // Moderation
  isModerated: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationNote: String
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ product: 1 });
reviewSchema.index({ rating: -1 });

// Compound indexes
reviewSchema.index({ reviewee: 1, reviewType: 1 });
reviewSchema.index({ reviewer: 1, reviewee: 1, order: 1 }, { unique: true });

// Pre-save validation
reviewSchema.pre('save', function(next) {
  // Ensure reviewer and reviewee are different
  if (this.reviewer.equals(this.reviewee)) {
    return next(new Error('Cannot review yourself'));
  }
  next();
});

// Static method to calculate average rating for a user
reviewSchema.statics.calculateAverageRating = async function(userId, reviewType) {
  const stats = await this.aggregate([
    {
      $match: {
        reviewee: userId,
        reviewType: reviewType,
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : { averageRating: 0, totalReviews: 0 };
};

// Transform output
reviewSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Review', reviewSchema);
