const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');
const Token = require('../../models/token.model');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
  const refreshToken = jwt.sign({ id: userId }, config.REFRESH_TOKEN_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRE,
  });
  return { accessToken, refreshToken };
};

const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    throw new ApiError(400, 'User already exists with this email or phone');
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  await Token.create({
    user: user._id,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  res.status(201).json(
    new ApiResponse(201, {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified
      },
      accessToken,
      refreshToken
    }, 'User registered successfully')
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  if (user.isBanned) {
    throw new ApiError(403, 'Account is banned');
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  await Token.create({
    user: user._id,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role
      },
      accessToken,
      refreshToken
    }, 'Login successful')
  );
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    await Token.deleteOne({ token: refreshToken });
  }

  res.status(200).json(
    new ApiResponse(200, null, 'Logout successful')
  );
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token required');
  }

  const tokenDoc = await Token.findOne({ token: refreshToken, type: 'refresh' });

  if (!tokenDoc) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  try {
    const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    await Token.deleteOne({ _id: tokenDoc._id });
    await Token.create({
      user: user._id,
      token: newRefreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.status(200).json(
      new ApiResponse(200, {
        accessToken,
        refreshToken: newRefreshToken
      }, 'Token refreshed successfully')
    );
  } catch (error) {
    await Token.deleteOne({ _id: tokenDoc._id });
    throw new ApiError(401, 'Invalid refresh token');
  }
});

module.exports = {
  register,
  login,
  logout,
  refreshToken
};
