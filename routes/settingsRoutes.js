// routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET Settings page
router.get('/', settingsController.getSettings);

// POST save settings
router.post('/', settingsController.saveSettings);

module.exports = router;
