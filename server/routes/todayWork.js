const express = require('express');
const router = express.Router();
const todayWorkController = require('../controllers/todayWorkController');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, todayWorkController.getTodayWork);

module.exports = router;