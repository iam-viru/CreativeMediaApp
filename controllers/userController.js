// controllers/userController.js
const db = require('../config/db');

// List all users
exports.listUsers = (req, res) => {
  db.query('SELECT * FROM users ORDER BY id ASC', (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.send('Database error.');
    }
    res.render('users', { users: results, user: req.session.user });
  });
};

// Add new user
exports.addUser = (req, res) => {
  const { username, name, password } = req.body;
  if (!username || !password) return res.redirect('/users');

  const query = `INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?)`;
  db.query(query, [username, name, password], err => {
    if (err) {
      console.error('Insert Error:', err);
      return res.send('Error adding user.');
    }
    res.redirect('/users');
  });
};

// Edit user
exports.editUser = (req, res) => {
  const { id } = req.params;
  const { username, name, password } = req.body;

  const query = `
    UPDATE users
    SET username = ?, name = ?, password_hash = ?, updated_at = NOW()
    WHERE id = ?
  `;
  db.query(query, [username, name, password, id], err => {
    if (err) {
      console.error('Update Error:', err);
      return res.send('Error updating user.');
    }
    res.redirect('/users');
  });
};

// Delete user
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], err => {
    if (err) {
      console.error('Delete Error:', err);
      return res.send('Error deleting user.');
    }
    res.redirect('/users');
  });
};
