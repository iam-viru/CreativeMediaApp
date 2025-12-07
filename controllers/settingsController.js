// controllers/settingsController.js
const db = require('../config/db');

// GET /settings
exports.getSettings = (req, res) => {
  const sql = 'SELECT * FROM settings LIMIT 1';

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Error loading settings:', err);
      // fallback: render with empty defaults
      return res.render('settings', {
        user: req.session.user,
        settings: {
          net32_username: '',
          net32_password: '',
          max_price_breaks: 5
        },
        status: 'error'
      });
    }

    const settings = rows[0] || {
      net32_username: '',
      net32_password: '',
      max_price_breaks: 5
    };

    res.render('settings', {
      user: req.session.user,
      settings,
      status: req.query.status || null
    });
  });
};

// POST /settings
exports.saveSettings = (req, res) => {
  const { net32_username, net32_password, max_price_breaks } = req.body;

  if (!net32_username || !net32_password) {
    return res.redirect('/settings?status=error');
  }

  const maxBreaks = parseInt(max_price_breaks, 10) || 5;

  // First check if a settings row already exists
  const checkSql = 'SELECT id FROM settings LIMIT 1';

  db.query(checkSql, (err, rows) => {
    if (err) {
      console.error('❌ Error checking settings:', err);
      return res.redirect('/settings?status=error');
    }

    if (rows.length > 0) {
      // Update existing record
      const id = rows[0].id;
      const updateSql = `
        UPDATE settings
        SET net32_username = ?, net32_password = ?, max_price_breaks = ?
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [net32_username, net32_password, maxBreaks, id],
        (err2) => {
          if (err2) {
            console.error('❌ Error updating settings:', err2);
            return res.redirect('/settings?status=error');
          }
          return res.redirect('/settings?status=success');
        }
      );
    } else {
      // Insert new record
      const insertSql = `
        INSERT INTO settings (net32_username, net32_password, max_price_breaks)
        VALUES (?, ?, ?)
      `;

      db.query(insertSql,
        [net32_username, net32_password, maxBreaks],
        (err2) => {
          if (err2) {
            console.error('❌ Error inserting settings:', err2);
            return res.redirect('/settings?status=error');
          }
          return res.redirect('/settings?status=success');
        }
      );
    }
  });
};
