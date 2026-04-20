const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/availability', publicController.checkAvailability);
router.get('/google-reviews', publicController.getGoogleReviews);
router.get('/receipt/:receiptNumber', publicController.findByReceipt);

module.exports = router;
