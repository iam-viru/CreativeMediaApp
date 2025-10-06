// controllers/authController.js
const db = require("../config/db");

// Render login page
exports.showLogin = (req, res) => {
  res.render("login", { error: null });
};

// Handle login
exports.loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("login", { error: "Please enter both fields." });
  }

  db.query(
    "SELECT * FROM users WHERE username = ? AND password_hash = ?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.render("login", { error: "Database error." });
      }

      if (results.length === 0) {
        return res.render("login", { error: "Invalid username or password." });
      }

      // Success
      req.session.user = results[0];
      db.query("UPDATE users SET last_login = NOW() WHERE id = ?", [results[0].id]);
      res.redirect("/products");
    }
  );
};

// Logout
exports.logoutUser = (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};
