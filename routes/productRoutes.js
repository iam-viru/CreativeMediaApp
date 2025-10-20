const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
// View all products
router.get('/', productController.getProducts);
// Single-row AJAX update
router.post('/update/:id', productController.updateProduct);
// Batch update
router.post('/batchUpdate', productController.batchUpdate);
// Add new product
router.post("/add", productController.addProduct);
// Delete product
router.post("/delete/:id", productController.deleteProduct);
// Fetch product info (Proxy API)
router.post('/fetchProduct', productController.fetchProduct);

router.post('/updateActive/:id', productController.updateActive);

//router.post('/updateInventory', productController.updateInventory);
// Update Inventory for a single product
router.post('/updateInventory', productController.updateInventory);



module.exports = router;
