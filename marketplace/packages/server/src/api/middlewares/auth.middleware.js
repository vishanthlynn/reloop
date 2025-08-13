const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const { asyncHandler } = require('../../utils/asyncHandler');
const config = require('../../config');

const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Access token is required'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new ApiError(401, 'User no longer exists'));
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new ApiError(401, 'Password changed recently. Please log in again'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'Account is deactivated'));
    }

    if (user.isBanned) {
      return next(new ApiError(403, 'Account is banned'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid token'));
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied'));
    }
    next();
  };
};

const verifyPhone = (req, res, next) => {
  if (!req.user.isPhoneVerified) {
    return next(new ApiError(403, 'Phone verification required'));
  }
  next();
};

const verifyKYC = (req, res, next) => {
  if (req.user.kycStatus !== 'verified') {
    return next(new ApiError(403, 'KYC verification required for this action'));
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  verifyPhone,
  verifyKYC
};
