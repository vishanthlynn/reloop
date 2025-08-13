import { Review } from '../../models/review.model.js';
import { Product } from '../../models/product.model.js';
import { Order } from '../../models/order.model.js';
import { User } from '../../models/user.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Create review
export const createReview = asyncHandler(async (req, res) => {
  const { orderId, rating, comment, reviewType } = req.body;
  const reviewerId = req.user._id;

  // Validate order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if order is delivered
  if (order.status !== 'delivered') {
    throw new ApiError(400, 'Can only review delivered orders');
  }

  // Determine reviewer and reviewee based on review type
  let reviewee;
  if (reviewType === 'product') {
    // Buyer reviews product
    if (order.buyer.toString() !== reviewerId.toString()) {
      throw new ApiError(403, 'Only buyer can review product');
    }
    reviewee = order.product;
  } else if (reviewType === 'seller') {
    // Buyer reviews seller
    if (order.buyer.toString() !== reviewerId.toString()) {
      throw new ApiError(403, 'Only buyer can review seller');
    }
    reviewee = order.seller;
  } else if (reviewType === 'buyer') {
    // Seller reviews buyer
    if (order.seller.toString() !== reviewerId.toString()) {
      throw new ApiError(403, 'Only seller can review buyer');
    }
    reviewee = order.buyer;
  } else {
    throw new ApiError(400, 'Invalid review type');
  }

  // Check if review already exists
  const existingReview = await Review.findOne({
    order: orderId,
    reviewer: reviewerId,
    reviewType
  });

  if (existingReview) {
    throw new ApiError(400, 'Review already exists for this order');
  }

  // Create review
  const review = await Review.create({
    order: orderId,
    reviewer: reviewerId,
    reviewee,
    reviewType,
    rating,
    comment,
    product: order.product,
    isVerifiedPurchase: true
  });

  // Update average ratings
  if (reviewType === 'product') {
    await updateProductRating(order.product);
  } else {
    await updateUserRating(reviewee, reviewType === 'seller' ? 'seller' : 'buyer');
  }

  res.status(201).json(
    new ApiResponse(201, review, 'Review created successfully')
  );
});

// Update review
export const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if user is the reviewer
  if (review.reviewer.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only update your own reviews');
  }

  // Update review
  review.rating = rating || review.rating;
  review.comment = comment || review.comment;
  review.isEdited = true;
  review.editedAt = new Date();
  await review.save();

  // Update average ratings
  if (review.reviewType === 'product') {
    await updateProductRating(review.product);
  } else {
    await updateUserRating(review.reviewee, review.reviewType === 'seller' ? 'seller' : 'buyer');
  }

  res.status(200).json(
    new ApiResponse(200, review, 'Review updated successfully')
  );
});

// Delete review
export const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if user is the reviewer or admin
  if (review.reviewer.toString() !== userId.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized to delete this review');
  }

  const { reviewType, product, reviewee } = review;
  
  await review.deleteOne();

  // Update average ratings
  if (reviewType === 'product') {
    await updateProductRating(product);
  } else {
    await updateUserRating(reviewee, reviewType === 'seller' ? 'seller' : 'buyer');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'Review deleted successfully')
  );
});

// Get product reviews
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const reviews = await Review.find({
    product: productId,
    reviewType: 'product'
  })
    .populate('reviewer', 'name avatar')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Review.countDocuments({
    product: productId,
    reviewType: 'product'
  });

  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    { $match: { product: productId, reviewType: 'product' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } }
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      ratingDistribution
    }, 'Product reviews fetched successfully')
  );
});

// Get user reviews
export const getUserReviews = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type = 'seller', page = 1, limit = 10 } = req.query;

  const reviews = await Review.find({
    reviewee: userId,
    reviewType: type
  })
    .populate('reviewer', 'name avatar')
    .populate('order', 'createdAt')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Review.countDocuments({
    reviewee: userId,
    reviewType: type
  });

  res.status(200).json(
    new ApiResponse(200, {
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, 'User reviews fetched successfully')
  );
});

// Report review
export const reportReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reason, description } = req.body;
  const reporterId = req.user._id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if already reported by this user
  const alreadyReported = review.reports.some(
    report => report.reporter.toString() === reporterId.toString()
  );

  if (alreadyReported) {
    throw new ApiError(400, 'You have already reported this review');
  }

  // Add report
  review.reports.push({
    reporter: reporterId,
    reason,
    description,
    reportedAt: new Date()
  });

  review.isReported = true;
  await review.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Review reported successfully')
  );
});

// Helper functions
async function updateProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: productId, reviewType: 'product' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: result[0].averageRating,
      totalReviews: result[0].totalReviews
    });
  }
}

async function updateUserRating(userId, type) {
  const field = type === 'seller' ? 'sellerRating' : 'buyerRating';
  const countField = type === 'seller' ? 'totalSellerReviews' : 'totalBuyerReviews';

  const result = await Review.aggregate([
    { $match: { reviewee: userId, reviewType: type } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    await User.findByIdAndUpdate(userId, {
      [field]: result[0].averageRating,
      [countField]: result[0].totalReviews
    });
  }
}
