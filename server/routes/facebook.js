const express = require('express');
const {
	syncFacebookPosts,
	getFacebookFeed,
	getMediaGallery,
	getMediaGalleryStats,
	manualSyncPosts,
    verifyWebhook,
    handleWebhook,
    forceSubscribePage
} = require('../controllers/facebookController');

const router = express.Router();

// Webhook Setup utility
router.get('/force-subscribe', forceSubscribePage);

// Public endpoints - جلب البوستات والصور للـ Frontend
router.get('/feed', getFacebookFeed);
router.get('/gallery', getMediaGallery);
router.get('/gallery/stats', getMediaGalleryStats);

// Webhook endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Admin endpoint - تحديث يدوي
router.post('/sync', manualSyncPosts);
// دعم GET عشان يتجرب من المتصفح بسهولة
router.get('/sync', manualSyncPosts);

module.exports = router;
