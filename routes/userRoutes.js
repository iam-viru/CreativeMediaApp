// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  listUsers,
  addUser,
  editUser,
  deleteUser,
} = require('../controllers/userController');

// View all users
router.get('/', listUsers);

// Add new user
router.post('/add', addUser);

// Edit user
router.post('/edit/:id', editUser);

// Delete user
router.get('/delete/:id', deleteUser);

module.exports = router;
