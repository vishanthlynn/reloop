const Product = require('../../models/product.model');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { LISTING_TYPES } = require('../../utils/constants');

const createProduct = asyncHandler(async (req, res) => {
  const productData = {
    ...req.body,
    seller: req.user._id
  };

  const product = await Product.create(productData);
  await product.populate('seller', 'firstName lastName avatar');

  res.status(201).json(
    new ApiResponse(201, product, 'Product created successfully')
  );
});

const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    condition,
    listingType,
    minPrice,
    maxPrice,
    city,
    state,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const filter = {
    isActive: true,
    isApproved: true,
    isSold: false
  };

  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (listingType) filter.listingType = listingType;
  if (city) filter['location.city'] = new RegExp(city, 'i');
  if (state) filter['location.state'] = new RegExp(state, 'i');

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const products = await Product.find(filter)
    .populate('seller', 'firstName lastName avatar sellerRating')
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Products fetched successfully')
  );
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('seller', 'firstName lastName avatar sellerRating isPhoneVerified');

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Increment view count
  product.views += 1;
  await product.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, product, 'Product fetched successfully')
  );
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (product.seller.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this product');
  }

  if (product.isSold) {
    throw new ApiError(400, 'Cannot update sold product');
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('seller', 'firstName lastName avatar');

  res.status(200).json(
    new ApiResponse(200, updatedProduct, 'Product updated successfully')
  );
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (product.seller.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to delete this product');
  }

  if (product.isSold) {
    throw new ApiError(400, 'Cannot delete sold product');
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, 'Product deleted successfully')
  );
});

const getMyProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = 'all' } = req.query;

  const filter = { seller: req.user._id };

  if (status === 'active') {
    filter.isActive = true;
    filter.isSold = false;
  } else if (status === 'sold') {
    filter.isSold = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total
      }
    }, 'My products fetched successfully')
  );
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getMyProducts
};
