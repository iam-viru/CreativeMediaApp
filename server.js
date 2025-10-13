// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan'); // ✅ optional but highly recommended for API logging

// Route modules
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ====================
// View Engine Setup
// ====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ====================
// Middlewares
// ====================
app.use(morgan('dev')); // ✅ logs all requests to console (GET, POST, status codes)

app.use(bodyParser.urlencoded({ extended: true })); // ✅ needed for HTML form arrays like id[], qty[], etc.
app.use(bodyParser.json());                         // ✅ required for JSON AJAX posts
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultsecret',
    resave: false,
    saveUninitialized: true,
  })
);

// ====================
// Auth Middleware
// ====================
function ensureAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  // Detect AJAX / fetch requests
  const isAjax = req.headers.accept?.includes('application/json') ||
                 req.headers['content-type']?.includes('application/json');

  if (isAjax) {
    return res.status(401).json(false); // ✅ return false instead of redirect
  }

  return res.redirect('/login');
}





// ====================
// Routes
// ====================
app.use('/', authRoutes);
app.use('/products', ensureAuth, productRoutes);
app.use('/users', ensureAuth, userRoutes);

// ====================
// Default Routes
// ====================
app.get('/', (req, res) => res.redirect('/login'));

// Catch-all route (404)
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// ====================
// Global Error Handler
// ====================
// ✅ Prevents “Unknown Error” showing raw stack to client.
app.use((err, req, res, next) => {
  console.error('💥 Global Error Handler:', err.stack || err);
 // res.status(500).render('error', { message: 'Something went wrong. Please try again.' });
 res.status(500).send(err.message || 'Internal Server Error');
});

// ====================
// Start Server
// ====================
const PORT = process.env.PORT || 3000;
const listEndpoints = require('express-list-endpoints');
console.log(listEndpoints(app));
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
