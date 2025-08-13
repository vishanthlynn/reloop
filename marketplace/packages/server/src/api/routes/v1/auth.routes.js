const express = require('express');
const { register, login, logout, refreshToken } = require('../../controllers/auth.controller');
const { body } = require('express-validator');
const router = express.Router();

router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

module.exports = router;
