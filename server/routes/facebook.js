const express = require('express');
const {
	syncFacebookPosts,
	getFacebookFeed,
	manualSyncPosts
} = require('../controllers/facebookController');

const router = express.Router();

// Public endpoint - جلب البوستات للـ Frontend
router.get('/feed', getFacebookFeed);

// Admin endpoint - تحديث يدوي
router.post('/sync', manualSyncPosts);

module.exports = router;
