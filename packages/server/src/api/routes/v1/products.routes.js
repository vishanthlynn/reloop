const express = require('express');
const { createProduct, getProducts, getProduct, updateProduct, deleteProduct, getMyProducts } = require('../../controllers/product.controller');
const { authenticate, verifyPhone } = require('../../middlewares/auth.middleware');
const router = express.Router();

router.get('/', getProducts);
router.get('/my-products', authenticate, getMyProducts);
router.get('/:id', getProduct);
router.post('/', authenticate, verifyPhone, createProduct);
router.put('/:id', authenticate, verifyPhone, updateProduct);
router.delete('/:id', authenticate, verifyPhone, deleteProduct);

module.exports = router;
