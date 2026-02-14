const express = require('express');
const {
	syncFacebookPosts,
	getFacebookFeed,
	getMediaGallery,
	getMediaGalleryStats,
	manualSyncPosts
} = require('../controllers/facebookController');

const router = express.Router();

// Public endpoints - جلب البوستات والصور للـ Frontend
router.get('/feed', getFacebookFeed);
router.get('/gallery', getMediaGallery);
router.get('/gallery/stats', getMediaGalleryStats);

// Admin endpoint - تحديث يدوي
router.post('/sync', manualSyncPosts);
// دعم GET عشان يتجرب من المتصفح بسهولة
router.get('/sync', manualSyncPosts);

module.exports = router;
