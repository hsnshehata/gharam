const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const authenticate = require('../middleware/authenticate');

router.get('/daily', authenticate, reportsController.getDailyReport);

module.exports = router;