// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET: list all products
router.get('/', productController.listProducts);

// AJAX search API
router.get('/search/ajax', (req, res) => {
  const db = require('../config/db'); // make sure db is available
  const term = `%${req.query.q || ''}%`;
  const query = `
    SELECT * FROM products
    WHERE product_name LIKE ? OR sku LIKE ?
    ORDER BY id ASC
    LIMIT 20
  `;
  db.query(query, [term, term], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB Error' });

    results.forEach(r => {
      r.price = parseFloat(r.price);
      r.minimum_price = parseFloat(r.minimum_price);
    });
    res.json(results);
  });
});

// POST: update editable fields
router.post('/update/:id', productController.updateProduct);

// ✅ Batch update
router.post('/batchUpdate', productController.batchUpdate);

module.exports = router;
