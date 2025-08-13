import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  updateAvatar,
  changePassword,
  getSellerProfile,
  toggleFollowSeller,
  getFollowers,
  getFollowing,
  getSavedProducts,
  toggleSaveProduct,
  initiateKYC,
  getKYCStatus,
  deleteAccount
} from '../../controllers/user.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
const { authenticate } = authMiddleware.default || authMiddleware;
import {
  validateUpdateProfile,
  validateKYC,
  validateMongoId,
  validatePagination
} from '../../middlewares/validator.middleware.js';
import upload from '../../middlewares/multer.middleware.js';

const router = Router();

// Public routes
router.get('/seller/:sellerId', validateMongoId('sellerId'), getSellerProfile);

// Protected routes
router.use(authenticate);

// Profile management
router.get('/profile', getUserProfile);
router.get('/profile/:userId', validateMongoId('userId'), getUserProfile);
router.patch('/profile', validateUpdateProfile, updateUserProfile);
router.patch('/avatar', upload.single('avatar'), updateAvatar);
router.post('/change-password', changePassword);

// Follow system
router.post('/follow/:sellerId', validateMongoId('sellerId'), toggleFollowSeller);
router.get('/followers', validatePagination, getFollowers);
router.get('/followers/:userId', validateMongoId('userId'), validatePagination, getFollowers);
router.get('/following', validatePagination, getFollowing);
router.get('/following/:userId', validateMongoId('userId'), validatePagination, getFollowing);

// Saved products
router.get('/saved-products', validatePagination, getSavedProducts);
router.post('/save-product/:productId', validateMongoId('productId'), toggleSaveProduct);

// KYC verification
router.post('/kyc/initiate', validateKYC, initiateKYC);
router.get('/kyc/status', getKYCStatus);

// Account deletion
router.delete('/account', deleteAccount);

export default router;
