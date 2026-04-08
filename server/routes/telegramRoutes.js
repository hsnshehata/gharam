const express = require('express');
const router = express.Router();
const auth = require('../middleware/authenticate');
const telegramController = require('../controllers/telegramController');

// Only allow admin or supervisor, or whatever is needed (we can restrict to admin here)
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }
};

// Protect routes
router.use(auth);

// Restrict to admin? The user said "مع امكانية الغاء ربط من قبل الادمن", 
// let's apply requireAdmin for at least adding/deleting. Or all.
router.get('/', requireAdmin, telegramController.getAccounts);
router.post('/', requireAdmin, telegramController.addAccount);
router.delete('/:id', requireAdmin, telegramController.deleteAccount);

module.exports = router;
