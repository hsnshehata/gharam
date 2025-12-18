const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/availability', publicController.checkAvailability);

module.exports = router;
