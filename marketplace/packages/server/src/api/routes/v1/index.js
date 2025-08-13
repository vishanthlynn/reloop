const express = require('express');

const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes').default;
const productRoutes = require('./products.routes');
const oauthRoutes = require('./oauth.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/auth/oauth', oauthRoutes);

module.exports = router;
