// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { showLogin, loginUser, logoutUser } = require("../controllers/authController");

// Route: GET /login
router.get("/login", showLogin);

// Route: POST /login
router.post("/login", loginUser);

// Route: GET /logout
router.get("/logout", logoutUser);

module.exports = router;
