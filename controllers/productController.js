const db = require('../config/db');
// Fetch all products (with pagination + search + fixed sorting)
exports.getProducts = (req, res) => {
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const searchCondition = search
    ? `WHERE product_name LIKE ? OR sku LIKE ?`
    : '';

  const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

  const countQuery = `SELECT COUNT(*) AS total FROM products ${searchCondition}`;
  const dataQuery = `
    SELECT * FROM products
    ${searchCondition}
    ORDER BY sku ASC, qty ASC
    LIMIT ? OFFSET ?
  `;

  db.query(countQuery, searchParams, (err, countResult) => {
    if (err) {
      console.error('Count query error:', err);
      return res.render('products', {
        user: req.session.user,
        products: [],
        search,
        totalPages: 0,
        currentPage: 1
      });
    }

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    db.query(
      dataQuery,
      [...searchParams, limit, offset],
      (err, results) => {
        if (err) {
          console.error('Data query error:', err);
          return res.render('products', {
            user: req.session.user,
            products: [],
            search,
            totalPages: 0,
            currentPage: 1
          });
        }

        res.render('products', {
          user: req.session.user,
          products: results,
          search,
          totalPages,
          currentPage: page
        });
      }
    );
  });
};
// Single-row AJAX update (true/false return)
exports.updateProduct = (req, res) => {
  debugger;
  const { id } = req.params;
  const { qty, minimum_price, update_interval } = req.body;

  const parsedQty = Number(qty);
  const parsedMin = Number(minimum_price);
  const isAjax = req.headers['content-type']?.includes('application/json');

  if (!id || isNaN(parsedQty) || isNaN(parsedMin) || !update_interval) {
    if (isAjax) return res.json(false);
    return res.redirect('/products?status=error');
  }

  const sql = `
    UPDATE products
    SET qty = ?, minimum_price = ?, update_interval = ?, last_update = NOW()
    WHERE id = ?
  `;

  db.query(sql, [parsedQty, parsedMin, update_interval, id], (err) => {
    if (err) {
      console.error('Single update error:', err);
      if (isAjax) return res.json(false);
      return res.redirect('/products?status=error');
    }

    if (isAjax) return res.json(true);
    res.redirect('/products?status=success');
  });
};
// Batch update (multi-row form submission)
exports.batchUpdate = (req, res) => {
  const { id, qty, minimum_price, update_interval, selected } = req.body;

  if (!selected || !Array.isArray(selected) || selected.length === 0) {
    console.log('No rows selected for update');
    return res.redirect('/products?status=error');
  }

  const updates = [];
  for (let i = 0; i < id.length; i++) {
    if (selected.includes(id[i])) {
      updates.push([qty[i], minimum_price[i], update_interval[i], id[i]]);
    }
  }

  if (updates.length === 0) {
    console.log('No valid rows found to update');
    return res.redirect('/products?status=error');
  }

  const sql = `
    UPDATE products
    SET qty = ?, minimum_price = ?, update_interval = ?, last_update = NOW()
    WHERE id = ?
  `;

  let completed = 0;
  let hasError = false;

  updates.forEach((u) => {
    db.query(sql, u, (err) => {
      completed++;
      if (err) {
        console.error('Batch update error:', err);
        hasError = true;
      }

      if (completed === updates.length) {
        if (hasError) return res.redirect('/products?status=error');
        return res.redirect('/products?status=success');
      }
    });
  });
};
// ===================== ADD NEW PRODUCT =====================
exports.addProduct = (req, res) => {
  const { sku, mpid, product_name, product_url, active, priceBreaks } = req.body;

  // Validate inputs
  if (!sku || !priceBreaks || !Array.isArray(priceBreaks) || priceBreaks.length === 0) {
    console.error('Invalid payload for addProduct');
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  // ✅ Use the first price break as the base record
  const pb = priceBreaks[0];

  const sql = `
    INSERT INTO products 
      (sku, mpid, product_name, product_url, price, qty, minimum_price, update_interval, active, last_update)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    sku,
    mpid || null,
    product_name || null,
    product_url || null,
    parseFloat(pb.min),      // price = minimum_price
    parseInt(pb.qty),
    parseFloat(pb.min),
    pb.interval,
    active ? 1 : 0
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Add product error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
    console.log(`✅ Product '${sku}' inserted successfully.`);
    return res.json({ success: true });
  });
};



// ===================== DELETE PRODUCT =====================
exports.deleteProduct = (req, res) => {
  const { id } = req.params;
  if (!id) return res.redirect('/products?status=error');

  const sql = 'DELETE FROM products WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Delete error:', err);
      return res.redirect('/products?status=error');
    }
    return res.redirect('/products?status=success');
  });
};

// ===================== FETCH PRODUCT DATA FROM EXTERNAL API =====================
  exports.fetchProduct = async (req, res) => {
  const axios = require("axios");
  const { vpCode } = req.body;

  if (!vpCode)
    return res.status(400).json({ success: false, message: "vpCode is required" });

  try {
     
    const url = `https://raw.githubusercontent.com/freelancerking/net32/refs/heads/main/${vpCode}.json`;
    const response = await axios.get(url, { responseType: "json" });

    const result = response.data?.payload?.result?.[0];
    if (!result) {
      return res.status(404).json({ success: false, message: "No data found in API response" });
    }

    const mpid = result.mpid ?? null;
    const description = result.description ?? "";

    console.log("✅ Extracted from API:", { mpid, description });
    return res.json({ success: true, mpid, description });
  } catch (err) {
    console.error("❌ fetchProduct error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ===================== FETCH PRODUCT DATA FROM EXTERNAL API =====================


exports.updateActive = (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  const isAjax = req.headers['content-type']?.includes('application/json');

  if (!id) {
    if (isAjax) return res.json(false);
    return res.redirect('/products?status=error');
  }

  const sql = `UPDATE products SET active = ?, last_update = NOW() WHERE id = ?`;

  db.query(sql, [active, id], (err) => {
    if (err) {
      console.error('Active update error:', err);
      if (isAjax) return res.json(false);
      return res.redirect('/products?status=error');
    }

    if (isAjax) return res.json(true);
    res.redirect('/products?status=success');
  });
};




