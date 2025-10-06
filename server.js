// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: true
}));

// Auth middleware (protect routes)
function ensureAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

// Routes
app.use('/', authRoutes);
app.use('/products', ensureAuth, productRoutes);
app.use('/users', ensureAuth, userRoutes);

// Default route
app.get('/', (req, res) => res.redirect('/login'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
