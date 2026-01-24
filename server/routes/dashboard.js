const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/authenticate');

router.get('/summary', authenticate, dashboardController.getDashboardSummary);

module.exports = router;