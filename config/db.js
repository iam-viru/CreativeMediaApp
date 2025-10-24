// config/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

// ✅ Use a connection pool instead of a single connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,   // keep up to 10 connections ready
  queueLimit: 0,
  enableKeepAlive: true, // 🔑 keeps TCP alive to prevent idle timeout
  keepAliveInitialDelay: 0
});

// ✅ Verify the pool works
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL pool connection failed:', err.message);
  } else {
    console.log('✅ MySQL pool initialized successfully');
    connection.release();
  }
});

// ✅ Optional keep-alive ping every minute (prevents idle drop)
setInterval(() => {
  db.query('SELECT 1', (err) => {
    if (err) console.error('⚠️ MySQL keep-alive ping failed:', err.message);
  });
}, 60000); // every 1 minute

module.exports = db;
