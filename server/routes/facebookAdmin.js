const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
	syncFacebookPosts,
	getAdminMediaGallery,
	updateMediaVisibility
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
router.get('/gallery', getAdminMediaGallery);
router.patch('/gallery/:id/visibility', updateMediaVisibility);

module.exports = router;
