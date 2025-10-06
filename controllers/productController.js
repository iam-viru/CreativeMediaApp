// controllers/productController.js
const db = require("../config/db");

// 🧩 List Products (with search + pagination)
exports.listProducts = (req, res) => {
  const searchTerm = req.query.search ? `%${req.query.search}%` : "%%";
  const page = parseInt(req.query.page) || 1;
  const limit = 10; // 10 items per page
  const offset = (page - 1) * limit;

  // First, count total rows
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

    // Fetch paginated + filtered products
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

      // Convert numeric fields from string → float
      results.forEach(r => {
        r.price = parseFloat(r.price);
        r.minimum_price = parseFloat(r.minimum_price);
      });

      // Render page
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

// 🧱 Update Product
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { qty, minimum_price, update_interval } = req.body;

  const updateQuery = `
    UPDATE products
    SET qty = ?, minimum_price = ?, update_interval = ?, updated_at = NOW()
    WHERE id = ?
  `;

  db.query(updateQuery, [qty, minimum_price, update_interval, id], err => {
    if (err) {
      console.error("Update Error:", err);
      return res.redirect("/products?status=error");
    }
    res.redirect("/products?status=success");
  });
};
