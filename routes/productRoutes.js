// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET: list all products
router.get('/', productController.listProducts);

// AJAX search API (moved to controller for consistency)
router.get('/search/ajax', productController.searchAjax);

// Single-row update
router.post('/update/:id', productController.updateProduct);

// Batch update (supports checkbox-selected or single-row "batch" posts)
router.post('/batchUpdate', productController.batchUpdate);

module.exports = router;
