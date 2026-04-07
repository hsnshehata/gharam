const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
	syncFacebookPosts,
	getAdminMediaGallery,
	updateMediaVisibility,
	deleteMediaGalleryItem,
	getAdminFacebookPosts,
	updateFacebookPostVisibility,
	deleteFacebookPost
} = require('../controllers/facebookController');

const router = express.Router();

const ensureAdmin = (req, res, next) => {
	if (req.user?.role !== 'admin') {
		return res.status(403).json({ msg: 'Access denied' });
	}
	next();
};

router.use(authenticate, ensureAdmin);

router.post('/sync', syncFacebookPosts);

// Gallery Routes
router.get('/gallery', getAdminMediaGallery);
router.patch('/gallery/:id/visibility', updateMediaVisibility);
router.delete('/gallery/:id', deleteMediaGalleryItem);

// Facebook Posts Routes
router.get('/posts', getAdminFacebookPosts);
router.patch('/posts/:id/visibility', updateFacebookPostVisibility);
router.delete('/posts/:id', deleteFacebookPost);

module.exports = router;
