import { User } from '../../models/user.model.js';
import { Product } from '../../models/product.model.js';
import { Order } from '../../models/order.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { kycService } from '../../services/kyc.service.js';
import bcrypt from 'bcryptjs';

// Get user profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;

  const user = await User.findById(userId).select('-password -refreshToken');
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Get additional stats if viewing own profile
  let stats = {};
  if (userId.toString() === req.user._id.toString()) {
    const [totalProducts, totalOrders, totalSales] = await Promise.all([
      Product.countDocuments({ seller: userId }),
      Order.countDocuments({ buyer: userId }),
      Order.countDocuments({ seller: userId, status: 'delivered' })
    ]);

    stats = {
      totalProducts,
      totalOrders,
      totalSales
    };
  }

  res.status(200).json(
    new ApiResponse(200, { user, stats }, 'User profile fetched successfully')
  );
});

// Update user profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    name,
    email,
    phone,
    bio,
    address,
    city,
    state,
    pincode,
    dateOfBirth
  } = req.body;

  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if email is already taken
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      throw new ApiError(400, 'Email already in use');
    }
  }

  // Check if phone is already taken
  if (phone && phone !== user.phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      throw new ApiError(400, 'Phone number already in use');
    }
  }

  // Update user fields
  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  user.bio = bio || user.bio;
  user.address = address || user.address;
  user.city = city || user.city;
  user.state = state || user.state;
  user.pincode = pincode || user.pincode;
  user.dateOfBirth = dateOfBirth || user.dateOfBirth;

  await user.save();

  const updatedUser = user.toObject();
  delete updatedUser.password;
  delete updatedUser.refreshToken;

  res.status(200).json(
    new ApiResponse(200, updatedUser, 'Profile updated successfully')
  );
});

// Update avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required');
  }

  // Upload to cloudinary or S3
  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // For now, we'll just save the local path
  const avatar = `/uploads/avatars/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar },
    { new: true }
  ).select('-password -refreshToken');

  res.status(200).json(
    new ApiResponse(200, user, 'Avatar updated successfully')
  );
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify current password
  const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
  
  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Hash new password
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Password changed successfully')
  );
});

// Get seller profile
export const getSellerProfile = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  const seller = await User.findById(sellerId)
    .select('name avatar bio city state sellerRating totalSellerReviews createdAt isVerified');

  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  // Get seller stats
  const [totalProducts, totalSold, responseTime] = await Promise.all([
    Product.countDocuments({ seller: sellerId, status: 'available' }),
    Order.countDocuments({ seller: sellerId, status: 'delivered' }),
    calculateResponseTime(sellerId)
  ]);

  // Get recent products
  const recentProducts = await Product.find({ 
    seller: sellerId, 
    status: 'available' 
  })
    .select('title images price category')
    .sort('-createdAt')
    .limit(6);

  res.status(200).json(
    new ApiResponse(200, {
      seller,
      stats: {
        totalProducts,
        totalSold,
        responseTime,
        memberSince: seller.createdAt
      },
      recentProducts
    }, 'Seller profile fetched successfully')
  );
});

// Follow/Unfollow seller
export const toggleFollowSeller = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const userId = req.user._id;

  if (sellerId === userId.toString()) {
    throw new ApiError(400, 'You cannot follow yourself');
  }

  const [user, seller] = await Promise.all([
    User.findById(userId),
    User.findById(sellerId)
  ]);

  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  const isFollowing = user.following.includes(sellerId);

  if (isFollowing) {
    // Unfollow
    user.following = user.following.filter(id => id.toString() !== sellerId);
    seller.followers = seller.followers.filter(id => id.toString() !== userId.toString());
  } else {
    // Follow
    user.following.push(sellerId);
    seller.followers.push(userId);
  }

  await Promise.all([user.save(), seller.save()]);

  res.status(200).json(
    new ApiResponse(200, 
      { isFollowing: !isFollowing }, 
      isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
    )
  );
});

// Get followers
export const getFollowers = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(userId)
    .populate({
      path: 'followers',
      select: 'name avatar bio',
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit
      }
    });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(
    new ApiResponse(200, {
      followers: user.followers,
      total: user.followers.length,
      currentPage: page,
      totalPages: Math.ceil(user.followers.length / limit)
    }, 'Followers fetched successfully')
  );
});

// Get following
export const getFollowing = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(userId)
    .populate({
      path: 'following',
      select: 'name avatar bio',
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit
      }
    });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(
    new ApiResponse(200, {
      following: user.following,
      total: user.following.length,
      currentPage: page,
      totalPages: Math.ceil(user.following.length / limit)
    }, 'Following fetched successfully')
  );
});

// Get saved products
export const getSavedProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 12 } = req.query;

  const user = await User.findById(userId)
    .populate({
      path: 'savedProducts',
      match: { status: 'available' },
      select: 'title images price category seller',
      populate: {
        path: 'seller',
        select: 'name avatar'
      },
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit
      }
    });

  res.status(200).json(
    new ApiResponse(200, {
      products: user.savedProducts,
      total: user.savedProducts.length,
      currentPage: page,
      totalPages: Math.ceil(user.savedProducts.length / limit)
    }, 'Saved products fetched successfully')
  );
});

// Toggle save product
export const toggleSaveProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  const [user, product] = await Promise.all([
    User.findById(userId),
    Product.findById(productId)
  ]);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const isSaved = user.savedProducts.includes(productId);

  if (isSaved) {
    user.savedProducts = user.savedProducts.filter(id => id.toString() !== productId);
  } else {
    user.savedProducts.push(productId);
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(200, 
      { isSaved: !isSaved }, 
      isSaved ? 'Product removed from saved' : 'Product saved successfully'
    )
  );
});

// Initiate KYC verification
export const initiateKYC = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { 
    documentType, 
    documentNumber,
    documentFront,
    documentBack,
    selfie
  } = req.body;

  const user = await User.findById(userId);

  if (user.kycStatus === 'verified') {
    throw new ApiError(400, 'KYC already verified');
  }

  if (user.kycStatus === 'pending') {
    throw new ApiError(400, 'KYC verification already in progress');
  }

  // Initiate KYC with external service
  const kycResult = await kycService.initiateVerification({
    userId,
    documentType,
    documentNumber,
    documentFront,
    documentBack,
    selfie
  });

  user.kycStatus = 'pending';
  user.kycDetails = {
    documentType,
    documentNumber: documentNumber.slice(-4), // Store only last 4 digits
    submittedAt: new Date(),
    verificationId: kycResult.verificationId
  };

  await user.save();

  res.status(200).json(
    new ApiResponse(200, 
      { kycStatus: user.kycStatus }, 
      'KYC verification initiated successfully'
    )
  );
});

// Get KYC status
export const getKYCStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('kycStatus kycDetails');

  res.status(200).json(
    new ApiResponse(200, {
      kycStatus: user.kycStatus,
      kycDetails: user.kycDetails
    }, 'KYC status fetched successfully')
  );
});

// Delete account
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { password, reason } = req.body;

  const user = await User.findById(userId);

  // Verify password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  
  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Password is incorrect');
  }

  // Check for active orders
  const activeOrders = await Order.countDocuments({
    $or: [
      { buyer: userId, status: { $in: ['pending', 'processing', 'shipped'] } },
      { seller: userId, status: { $in: ['pending', 'processing', 'shipped'] } }
    ]
  });

  if (activeOrders > 0) {
    throw new ApiError(400, 'Cannot delete account with active orders');
  }

  // Soft delete - mark as deleted but keep data for records
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletionReason = reason;
  user.email = `deleted_${user._id}_${user.email}`;
  user.phone = `deleted_${user._id}_${user.phone}`;
  await user.save();

  // Remove all products
  await Product.updateMany(
    { seller: userId },
    { status: 'deleted', isDeleted: true }
  );

  res.status(200).json(
    new ApiResponse(200, null, 'Account deleted successfully')
  );
});

// Helper function to calculate response time
async function calculateResponseTime(sellerId) {
  // This would calculate average response time from chat messages
  // For now, returning a placeholder
  return '< 1 hour';
}
