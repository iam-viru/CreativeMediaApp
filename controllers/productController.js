// controllers/productController.js
const db = require("../config/db");

// ---------- helpers ----------
const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const asArray = (v) => (Array.isArray(v) ? v : v !== undefined ? [v] : []);

const logErr = (label, err, extra = {}) => {
  console.error(`[${new Date().toISOString()}] ${label}`, { extra, err });
};

// ---------- list products (unchanged behavior) ----------
exports.listProducts = (req, res) => {
  const searchTerm = req.query.search ? `%${req.query.search}%` : "%%";
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) AS count
    FROM products
    WHERE product_name LIKE ? OR sku LIKE ?;
  `;

  db.query(countQuery, [searchTerm, searchTerm], (err, countResult) => {
    if (err) {
      logErr("Count Query Error", err);
      return res.status(500).send("Database error.");
    }

    const totalRows = countResult[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / limit));

    const dataQuery = `
      SELECT * FROM products
      WHERE product_name LIKE ? OR sku LIKE ?
      ORDER BY id ASC
      LIMIT ? OFFSET ?;
    `;

    db.query(dataQuery, [searchTerm, searchTerm, limit, offset], (err2, results) => {
      if (err2) {
        logErr("Data Query Error", err2);
        return res.status(500).send("Database error.");
      }

      results.forEach((r) => {
        r.price = parseFloat(r.price);
        r.minimum_price = parseFloat(r.minimum_price);
      });

      res.render("products", {
        user: req.session?.user || null,
        products: results,
        currentPage: page,
        totalPages,
        search: req.query.search || "",
      });
    });
  });
};

// ---------- AJAX search (kept for parity) ----------
exports.searchAjax = (req, res) => {
  const term = `%${req.query.q || ""}%`;
  const query = `
    SELECT * FROM products
    WHERE product_name LIKE ? OR sku LIKE ?
    ORDER BY id ASC
    LIMIT 20
  `;
  db.query(query, [term, term], (err, results) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    results.forEach((r) => {
      r.price = parseFloat(r.price);
      r.minimum_price = parseFloat(r.minimum_price);
    });
    res.json(results);
  });
};

// ---------- single product update ----------
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { qty, minimum_price, update_interval } = req.body;

  const parsedQty = Number(qty);
  const parsedMin = Number(minimum_price);

  const isAjax = req.headers['content-type']?.includes('application/json');

  if (!id || isNaN(parsedQty) || isNaN(parsedMin) || !update_interval) {
    // If it's AJAX, send simple false
    if (isAjax) return res.json(false);
    debugger;
    return res.redirect('/products?status=error');
  }

  const sql = `
    UPDATE products
    SET qty = ?, minimum_price = ?, update_interval = ?, updated_at = NOW()
    WHERE id = ?
  `;

  db.query(sql, [parsedQty, parsedMin, update_interval, id], (err) => {
    if (err) {
      console.error('Single update error:', err);
      alert(err);
      if (isAjax) return res.json(false);
      return res.redirect('/products?status=error');
    }

    // ✅ For AJAX → just return true / false
    if (isAjax) return res.json(true);

    // Normal form redirect (batch)
    res.redirect('/products?status=success');
  });
};





// ---------- batch update (checkbox based and also supports single-row 'batch') ----------
exports.batchUpdate = async (req, res) => {
  try {
    console.log("Incoming batch body:", req.body);

    const asArray = (v) => (Array.isArray(v) ? v : v !== undefined ? [v] : []);
    const toNum = (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const selectedIds = new Set(asArray(req.body.selected).map(String));
    const ids = asArray(req.body.id).map(String);
    const qtyArr = asArray(req.body.qty);
    const minPriceArr = asArray(req.body.minimum_price);
    const intArr = asArray(req.body.update_interval);

    console.log("Parsed IDs:", ids);
    console.log("Selected IDs:", [...selectedIds]);
    console.log("Quantities:", qtyArr);
    console.log("Min Prices:", minPriceArr);
    console.log("Update Intervals:", intArr);

    if (ids.length === 0) {
      console.log("❌ No IDs received in body");
      return res.status(400).send("No product IDs received. Check form field names.");
    }

    // Build normalized rows
    const rows = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (selectedIds.size > 0 && !selectedIds.has(id)) continue;

      const qty = toNum(qtyArr[i]);
      const minimum_price = toNum(minPriceArr[i]);
      const update_interval = toNum(intArr[i]);

      if (Number.isNaN(qty) || Number.isNaN(minimum_price) || Number.isNaN(update_interval)) {
        console.log("⚠️ Skipping invalid row:", { id, qty, minimum_price, update_interval });
        continue;
      }

      rows.push({ id, qty, minimum_price, update_interval });
    }

    console.log("Rows ready to update:", rows);

    if (rows.length === 0) {
      console.log("❌ No valid rows to update.");
      return res.status(400).send("No valid rows found to update. Check field names or input values.");
    }

    const sql = `
      UPDATE products
      SET qty = ?, minimum_price = ?, update_interval = ?, updated_at = NOW()
      WHERE id = ?
    `;

    for (const r of rows) {
      console.log("➡️ Updating row:", r);
      await new Promise((resolve, reject) => {
        db.query(sql, [r.qty, r.minimum_price, r.update_interval, r.id], (err) => {
          if (err) {
            console.error("❌ SQL Error:", err);
            reject(err);
          } else resolve();
        });
      });
    }

    console.log("✅ Batch update successful.");
    return res.status(200).send("Batch update completed successfully.");
  } catch (err) {
    console.error("💥 Batch Update Error:", err);
    return res.status(500).send(`<pre>${err.stack || err.message}</pre>`);
  }
};

