const db = require('../config/db');

// ✅ Fetch all products (with pagination + search + fixed sorting)
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


// ✅ Single-row AJAX update (true/false return)
exports.updateProduct = (req, res) => {
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


// ✅ Batch update (multi-row form submission)
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
