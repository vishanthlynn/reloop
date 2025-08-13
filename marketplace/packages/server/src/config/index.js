require('dotenv').config();

const config = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret',
  REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || '30d',
  
  // Cloudinary
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },
  
  // Payment
  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID,
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  },
  
  // Shipping
  SHIPROCKET: {
    EMAIL: process.env.SHIPROCKET_EMAIL,
    PASSWORD: process.env.SHIPROCKET_PASSWORD,
  },
  DELHIVERY: {
    API_KEY: process.env.DELHIVERY_API_KEY,
  },
  
  // AI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Communication
  TWILIO: {
    ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  },
  
  // Email
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: process.env.SMTP_PORT,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  },
  
  // Frontend URLs
  WEB_URL: process.env.WEB_URL || 'http://localhost:3000',
  MOBILE_URL: process.env.MOBILE_URL || 'http://localhost:3001',
};

module.exports = config;
