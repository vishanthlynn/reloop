const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./products.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);

module.exports = router;
