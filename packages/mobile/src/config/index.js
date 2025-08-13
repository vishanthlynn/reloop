import { Platform } from 'react-native';

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:5000/api' 
    : 'http://10.0.2.2:5000/api'
  : 'https://api.marketplace.com/api';

export const SOCKET_URL = __DEV__
  ? Platform.OS === 'ios'
    ? 'http://localhost:5000'
    : 'http://10.0.2.2:5000'
  : 'https://api.marketplace.com';

// App Configuration
export const APP_CONFIG = {
  appName: 'Marketplace',
  version: '1.0.0',
  supportEmail: 'support@marketplace.com',
  termsUrl: 'https://marketplace.com/terms',
  privacyUrl: 'https://marketplace.com/privacy',
};

// Image Upload Configuration
export const IMAGE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxImages: 10,
  quality: 0.8,
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
};

// Payment Configuration
export const PAYMENT_CONFIG = {
  razorpayKey: 'YOUR_RAZORPAY_KEY_ID', // TODO: User needs to change this
  currency: 'INR',
  merchantName: 'Marketplace',
};

// Map Configuration
export const MAP_CONFIG = {
  defaultRegion: {
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
};

// Categories
export const CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: 'laptop' },
  { id: 'fashion', name: 'Fashion', icon: 'tshirt-crew' },
  { id: 'home', name: 'Home & Garden', icon: 'home' },
  { id: 'vehicles', name: 'Vehicles', icon: 'car' },
  { id: 'sports', name: 'Sports & Hobbies', icon: 'basketball' },
  { id: 'books', name: 'Books', icon: 'book-open-variant' },
  { id: 'services', name: 'Services', icon: 'account-group' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal' },
];

// Sort Options
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'nearest', label: 'Nearest First' },
];

// Price Ranges
export const PRICE_RANGES = [
  { min: 0, max: 1000, label: 'Under ₹1,000' },
  { min: 1000, max: 5000, label: '₹1,000 - ₹5,000' },
  { min: 5000, max: 10000, label: '₹5,000 - ₹10,000' },
  { min: 10000, max: 50000, label: '₹10,000 - ₹50,000' },
  { min: 50000, max: null, label: 'Above ₹50,000' },
];
