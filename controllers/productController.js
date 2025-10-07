const db = require("../config/db");

// List Products (with search + pagination)
exports.listProducts = (req, res) => {
  const searchTerm = req.query.search ? `%${req.query.search}%` : "%%";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) AS count
    FROM products
    WHERE product_name LIKE ? OR sku LIKE ?;
  `;

  db.query(countQuery, [searchTerm, searchTerm], (err, countResult) => {
    if (err) {
      console.error("Count Query Error:", err);
      return res.send("Database error.");
    }

    const totalRows = countResult[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    const dataQuery = `
      SELECT * FROM products
      WHERE product_name LIKE ? OR sku LIKE ?
      ORDER BY id ASC
      LIMIT ? OFFSET ?;
    `;

    db.query(dataQuery, [searchTerm, searchTerm, limit, offset], (err, results) => {
      if (err) {
        console.error("Data Query Error:", err);
        return res.send("Database error.");
      }

      results.forEach(r => {
        r.price = parseFloat(r.price);
        r.minimum_price = parseFloat(r.minimum_price);
      });

      res.render("products", {
        user: req.session.user,
        products: results,
        currentPage: page,
        totalPages: totalPages || 1,
        search: req.query.search || "",
      });
    });
  });
};

//  Batch Update (checkbox-based)
exports.batchUpdate = (req, res) => {
  const { selected, id, qty, minimum_price, update_interval } = req.body;

  if (!selected) {
    return res.redirect("/products?status=error");
  }

  const selectedIds = Array.isArray(selected) ? selected : [selected];

  const updates = [];
  for (let i = 0; i < id.length; i++) {
    if (selectedIds.includes(id[i])) {
      updates.push([qty[i], minimum_price[i], update_interval[i], id[i]]);
    }
  }

  const sql = `
    UPDATE products
    SET qty = ?, minimum_price = ?, update_interval = ?, updated_at = NOW()
    WHERE id = ?
  `;

  const promises = updates.map(u =>
    new Promise((resolve, reject) => {
      db.query(sql, u, (err) => (err ? reject(err) : resolve()));
    })
  );

  Promise.all(promises)
    .then(() => res.redirect("/products?status=success"))
    .catch(err => {
      console.error("Batch Update Error:", err);
      res.redirect("/products?status=error");
    });
};

// Single product update (optional route)
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { qty, minimum_price, update_interval } = req.body;

  const sql = `
    UPDATE products
    SET qty = ?, minimum_price = ?, update_interval = ?, updated_at = NOW()
    WHERE id = ?
  `;

  db.query(sql, [qty, minimum_price, update_interval, id], (err) => {
    if (err) {
      console.error("Update Product Error:", err);
      return res.redirect("/products?status=error");
    }
    res.redirect("/products?status=success");
  });
};

