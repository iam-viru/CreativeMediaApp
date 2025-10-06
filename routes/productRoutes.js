// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { listProducts, updateProduct } = require('../controllers/productController');

// GET: list all products
router.get('/', listProducts);

// AJAX search API
router.get('/search/ajax', (req, res) => {
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
router.post('/update/:id', updateProduct);

module.exports = router;
