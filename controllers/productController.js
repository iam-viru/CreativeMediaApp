const db = require('../config/db');
const { API_HEADERS, BASE_API_URL } = require('../config/apiConfig');
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
  console.log('Batch update request body:', req.body);
  const { id, qty, minimum_price, update_hours,  
    update_minutes, selected } = req.body;

  if (!selected || !Array.isArray(selected) || selected.length === 0) {
    console.log('No rows selected for update');
    return res.redirect('/products?status=error');
  }

  const updates = [];
  for (let i = 0; i < id.length; i++) {
    if (selected.includes(id[i])) { 
      const hours = update_hours && update_hours[i] ? parseInt(update_hours[i]) || 0 : 0;
      const minutes = update_minutes && update_minutes[i] ? parseInt(update_minutes[i]) || 0 : 0;
      const totalInterval = (hours * 60) + minutes;
      updates.push([qty[i], minimum_price[i], totalInterval, id[i]]);
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
// ===================== ADD NEW PRODUCT STARTS =====================
exports.addProduct = (req, res) => {
  const { sku, mpid, product_name, product_url, inventory, priceBreaks } = req.body;

  // 1️⃣ Validate required fields
  if (!sku || !mpid || !product_name || !product_url || inventory == null) {
    console.error("❌ Missing required fields");
    return res.status(400).json({
      success: false,
      message: "MPID, Product Name, Product URL, and Inventory are required",
    });
  }

  if (!Array.isArray(priceBreaks) || priceBreaks.length === 0) {
    return res.status(400).json({ success: false, message: "At least one price break is required" });
  }

  // 2️⃣ Default values for min price & interval if missing
  const finalPriceBreaks = priceBreaks.map(pb => ({
    qty: pb.qty || 0,
    min: pb.min || 0,
    interval: pb.interval || 720, // default 12 hours (in minutes)
    activeCd: pb.activeCd || 0
  }));

  // 3️⃣ Check for duplicate SKU + Qty before insert
  const checkSql = "SELECT COUNT(*) AS count FROM products WHERE sku = ? AND qty = ?";
  let duplicateFound = false;

  const checkNext = (index) => {
    if (index >= finalPriceBreaks.length) {
      if (duplicateFound) {
        console.log("⚠️ Duplicate SKU+Qty found. Aborting insert.");
        return res.status(400).json({
          success: false,
          message: "Duplicate SKU and Qty combination already exists. Aborting save.",
        });
      }
const inv = inventory && !isNaN(inventory) && Number(inventory) > 0
  ? parseInt(inventory)
  : 9999; // default if blank or invalid

      // 4️⃣ If no duplicates, insert all rows
      const values = finalPriceBreaks.map(pb => [
        sku,
        mpid,
        product_name,
        product_url,
        0, // default price (can be updated later)
        parseInt(pb.qty),
        parseFloat(pb.min || 0),
        pb.interval,
        inv,
        pb.activeCd ?? 1, // ✅ Active per price break
        new Date(),
      ]);

      const insertSql = `
        INSERT INTO products 
          (sku, mpid, product_name, product_url, price, qty, minimum_price, update_interval, inventory, active, last_update)
        VALUES ?
      `;

      db.query(insertSql, [values], (err, result) => {
       if (err) {
  console.error("❌ Add product error:", err);

  // Handle duplicate SKU or unique constraint errors nicely
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(400).json({
      success: false,
      message: "Duplicate SKU already exists. Please use a different SKU.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Database error. Please try again.",
  });
}

        console.log(`✅ ${result.affectedRows} product rows inserted.`);
        return res.json({ success: true, message: "Product(s) added successfully" });
      });
      return;
    }

    // 🔄 Check for duplicates for current row
    const pb = finalPriceBreaks[index];
    db.query(checkSql, [sku, pb.qty], (err, results) => {
      if (err) {
        console.error("❌ Error checking duplicate SKU+Qty:", err);
        return res.status(500).json({ success: false, message: "DB error" });
      }

      if (results[0].count > 0) {
        duplicateFound = true;
      }

      checkNext(index + 1);
    });
  };

  checkNext(0);
};
// ===================== ADD NEW PRODUCT ENDS=====================

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

     //for testing purpose 
    //const apiUrl = `https://raw.githubusercontent.com/freelancerking/net32/refs/heads/main/${vpCode}.json`;
      // ✅ POST body (payload)
    const payload = {
      vpCode: vpCode,
      mpid: "",
      status: "all",
      limit: 1,
      after_vpCode: ""
    };

     // ✅ Required headers (client instruction)
    const headers = {
      'Cache-Control': 'no-cache',
      'Subscription-Key': process.env.SUBSCRIPTION_KEY || 'YOUR_SUBSCRIPTION_KEY_HERE',
      'Content-Type': 'application/json'
    };

    //production purpose
  const apiUrl = `https://raw.githubusercontent.com/freelancerking/net32/refs/heads/main/${vpCode}.json`;
  const response = await axios.post(apiUrl, payload, { headers });
  //const response = await axios.get(apiUrl, { responseType: "json" });

    const result = response.data?.payload?.result?.[0];
    if (!result) {
      return res.status(404).json({ success: false, message: "No data found in API response" });
    }

    const mpid = result.mpid ?? null;
    const description = result.description ?? "";
    //const inventory = result.inventory ?? 0;
    const active = result.priceList?.find(p => p.activeCd === 1) ? 1 : 0;

    // ✅ Extract up to 5 price breaks
      const priceBreaks = (result.priceList || [])
        .slice(0, 5)
        .map(p => ({
          qty: p.minQty,
          minPrice: 0,
          interval: 21, // default hours
        }));

    console.log("✅ Extracted from API:", { mpid, description, priceBreaks, active });
    return res.json({ success: true, mpid, description, active, priceBreaks });
  } catch (err) {
    console.error("❌ fetchProduct error:", err.message);
    // ✅ Handle 403 separately
    if (err.response && err.response.status === 403) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden. Check your Subscription Key or API permission."
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ===================== FETCH PRODUCT DATA FROM EXTERNAL API START =====================
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
// ===================== FETCH PRODUCT DATA FROM EXTERNAL API ENDS =====================

// ===================== UPDATE INVENTORY =====================
 // Update Inventory (calls external API, then updates DB)
  /*exports.updateInventory = async (req, res) => {
  const axios = require("axios");
  const { sku, inventory } = req.body;

  if (!sku || inventory == null) {
    return res.status(400).json({ success: false, message: "SKU and inventory are required" });
  }

  // 🔹 Fetch product info by SKU
  const sqlSelect = "SELECT sku, mpid FROM products WHERE sku = ? LIMIT 1";
  db.query(sqlSelect, [sku], async (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ success: false, message: "Product not found" });

    const product = results[0];
console.log("Fetched product for inventory update:", product);
    const payload = {
      vpCode: product.sku,
      mpid: product.mpid,
      priceList: [],
      fulfillmentPolicy: "stock",
      pht: 1, // ✅ per latest client note (was 5)
      inventory: parseInt(inventory, 10)
    };

    console.log("Sending inventory update payload:", payload);

    try {
      const response = await axios.post(
        `https://raw.githubusercontent.com/freelancerking/net32/refs/heads/main/${product.sku}.json`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Subscription-Key": process.env.INVENTORY_SUBSCRIPTION_KEY || "YOUR_SUBSCRIPTION_KEY_HERE",
          },
          timeout: 5000
        }
      );

   // const apiUrl = `https://raw.githubusercontent.com/freelancerking/net32/refs/heads/main/${product.sku}.json`; 
   // const response = await axios.get(apiUrl, { responseType: "json" });

      console.log("✅ External API response:", response.status);

      // ✅ Update DB by SKU
      const sqlUpdate = "UPDATE products SET inventory = ?, last_update = NOW() WHERE sku = ?";
      db.query(sqlUpdate, [inventory, sku], (err2) => {
        if (err2) {
          console.error("❌ DB update failed:", err2.message);
          return res.status(500).json({ success: false, message: "DB update failed" });
        }

        return res.json({ success: true, message: "Inventory updated successfully" });
      });
    } catch (apiErr) {
      console.error("❌ External API error:", apiErr.message);
      return res.status(500).json({ success: false, message: "External API call failed" });
    }
  });
};*/

   /*exports.updateInventory = async (req, res) => {
  const axios = require("axios");
  const { sku, inventory } = req.body;
console.log("incomming parameters :",sku,inventory);
  if (!sku || inventory == null) {
    return res.status(400).json({ success: false, message: "SKU and inventory are required" });
  }

  const sqlSelect = "SELECT sku, mpid FROM products WHERE sku = ? LIMIT 1";
  db.query(sqlSelect, [sku], async (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ success: false, message: "Product not found" });

    const product = results[0];

    const payload = {
      vpCode: product.sku,
      mpid: product.mpid,
      priceList: [],
      fulfillmentPolicy: "stock",
      pht: 1,
      inventory: parseInt(inventory, 10)
    };

 console.log("Sending Inventory Update Payload:", payload);
 console.log("calling the api:https://freelancerking.biz.id/update_inventory.php ");
    try {
      const response = await axios.post(
        "https://freelancerking.biz.id/update_inventory.php",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Subscription-Key": process.env.SUBSCRIPTION_KEY || "YOUR_SUBSCRIPTION_KEY_HERE"
          },
          timeout: 10000,
          responseType: "text"
        }
      );

      console.log("✅ Raw API Response:", response.data);

      // ✅ Extract the last valid JSON from the response
      let parsedData;
      try {
        const matches = response.data.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
        console.log("data match :", matches);
        if (matches && matches.length > 0) {
          parsedData = JSON.parse(matches[matches.length - 1]); // last JSON block
             console.log("data matched :", parsedData);
        } else {
          parsedData = JSON.parse(response.data);
          console.log("data not matched :", parsedData);
        }
      } catch (parseErr) {
        console.error("⚠️ Failed to parse API response:", parseErr.message);
        console.log("🔍 Raw Data:", response.data.slice(0, 300));
        return res.status(500).json({
          success: false,
          message: "Invalid or malformed JSON returned by external API",
        });
      }

      // ✅ Check success flag
      const isSuccessful =
        parsedData.statusCode === 200 || parsedData.success === true;

      if (isSuccessful) {
        const sqlUpdate =
          "UPDATE products SET inventory = ?, last_update = NOW() WHERE sku = ?";
        db.query(sqlUpdate, [inventory, sku], (err2) => {
          if (err2) {
            console.error("❌ DB update failed:", err2.message);
            return res.status(500).json({ success: false, message: "DB update failed" });
          }

          return res.json({
            success: true,
            message: "✅ Inventory updated successfully!",
            apiResponse: parsedData,
          });
        });
      } else {
        console.error("⚠️ Unexpected API Response Format:", parsedData);
        return res.status(500).json({
          success: false,
          message: "External API returned an unexpected format",
        });
      }
    } catch (apiErr) {
      console.error("❌ External API error:", apiErr.message);
      return res
        .status(500)
        .json({ success: false, message: "External API call failed" });
    }
  });
};*/

const axios = require("axios");
const logger = require("../utils/logger");

exports.updateInventory = async (req, res) => {
  logger.info("🟢 ===== Incoming /products/updateInventory Request =====");
  logger.debug("Headers: " + JSON.stringify(req.headers, null, 2));
  logger.debug("Body: " + JSON.stringify(req.body, null, 2));

  const { sku, inventory } = req.body;
  logger.info(`Incoming parameters → sku: ${sku}, inventory: ${inventory}`);

  if (!sku || inventory == null) {
    logger.warn("Missing required fields");
    return res
      .status(400)
      .json({ success: false, message: "SKU and inventory are required" });
  }

  const sqlSelect = "SELECT sku, mpid FROM products WHERE sku = ? LIMIT 1";
  db.query(sqlSelect, [sku], async (err, results) => {
    if (err) {
      logger.error("DB select error: " + err.message);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    if (results.length === 0) {
      logger.warn(`Product not found for SKU ${sku}`);
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const product = results[0];
    const payload = {
      vpCode: product.sku,
      mpid: product.mpid,
      priceList: [],
      fulfillmentPolicy: "stock",
      pht: 1,
      inventory: parseInt(inventory, 10),
    };

    logger.info("Sending Inventory Update Payload: " + JSON.stringify(payload));
    logger.info("Calling API: https://freelancerking.biz.id/update_inventory.php");

    try {
      const response = await axios.post(
        "https://freelancerking.biz.id/update_inventory.php",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Subscription-Key":
              process.env.SUBSCRIPTION_KEY || "YOUR_SUBSCRIPTION_KEY_HERE",
          },
          timeout: 10000,
          responseType: "text",
        }
      );

      logger.debug("Raw API Response: " + response.data);

      // Extract the last valid JSON block
      let parsedData;
      try {
        const matches = response.data.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
        logger.debug("Regex matches: " + JSON.stringify(matches));
        if (matches && matches.length > 0) {
          parsedData = JSON.parse(matches[matches.length - 1]);
          logger.debug("Parsed JSON (matched): " + JSON.stringify(parsedData));
        } else {
          parsedData = JSON.parse(response.data);
          logger.debug("Parsed JSON (direct): " + JSON.stringify(parsedData));
        }
      } catch (parseErr) {
        logger.error("Parse error: " + parseErr.message);
        logger.error("Raw snippet: " + response.data.slice(0, 300));
        return res.status(500).json({
          success: false,
          message: "Invalid or malformed JSON returned by external API",
        });
      }

      const isSuccessful =
        parsedData.statusCode === 200 || parsedData.success === true;

      if (isSuccessful) {
        const sqlUpdate =
          "UPDATE products SET inventory = ?, last_update = NOW() WHERE sku = ?";
        db.query(sqlUpdate, [inventory, sku], (err2) => {
          if (err2) {
            logger.error("DB update failed: " + err2.message);
            return res
              .status(500)
              .json({ success: false, message: "DB update failed" });
          }

          logger.info(`✅ Inventory updated in DB for SKU ${sku}`);
          return res.json({
            success: true,
            message: "✅ Inventory updated successfully!",
            apiResponse: parsedData,
          });
        });
      } else {
        logger.warn("Unexpected API response format: " + JSON.stringify(parsedData));
        return res.status(500).json({
          success: false,
          message: "External API returned an unexpected format",
        });
      }
    } catch (apiErr) {
      logger.error("External API error: " + apiErr.message);
      if (apiErr.response)
        logger.error("API error body: " + JSON.stringify(apiErr.response.data));
      return res
        .status(500)
        .json({ success: false, message: "External API call failed" });
    } finally {
      logger.info("🟣 ===== End /products/updateInventory Request =====\n");
    }
  });
};






// ===================== UPDATE INVENTORY ENDS =====================




