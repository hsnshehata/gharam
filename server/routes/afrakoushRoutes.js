const express = require('express');
const router = express.Router();
const AfrakoushPage = require('../models/AfrakoushPage');
const authenticate = require('../middleware/authenticate');
const User = require('../models/User');

// Helper to check roles
const roleLevels = { public: 0, employee: 1, supervisor: 2, admin: 3 };
const getUserLevel = (role) => roleLevels[role] || 1;

// Get a specific page by name
router.get('/:name', async (req, res) => {
    try {
        const page = await AfrakoushPage.findOne({ name: req.params.name });
        if (!page) {
            return res.status(404).json({ message: 'الأداة غير موجودة' });
        }
        
        if (page.status === 'paused') {
            return res.status(403).json({ message: 'هذه الأداة متوقفة مؤقتاً' });
        }

        // If public, allow access unconditionally
        if (page.allowedRole === 'public') {
            return res.json(page);
        }

        // Otherwise, requires authentication
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

        const jwt = require('jsonwebtoken');
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ msg: 'Token is not valid' });
        }

        const user = await User.findById(decoded.user.id).select('role');
        if (!user) return res.status(401).json({ msg: 'User not found' });

        const requiredLevel = roleLevels[page.allowedRole] || 3;
        const currentLevel = getUserLevel(user.role);

        if (currentLevel < requiredLevel) {
            return res.status(403).json({ message: 'ليس لديك صلاحية لفتح هذه الأداة' });
        }

        res.json(page);
    } catch (err) {
        console.error('Error fetching afrakoush page:', err);
        res.status(500).send('Server Error');
    }
});

// Admin ONLY: Get all pages for registry
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'غير مصرح لك' });
        }
        
        const pages = await AfrakoushPage.find().sort({ createdAt: -1 });
        res.json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Admin ONLY: Delete a page
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (user.role !== 'admin') return res.status(403).json({ message: 'غير مصرح لك' });

        await AfrakoushPage.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم الحذف بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Admin ONLY: Update status or role
router.put('/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (user.role !== 'admin') return res.status(403).json({ message: 'غير مصرح لك' });

        const { status, allowedRole } = req.body;
        const page = await AfrakoushPage.findById(req.params.id);
        if (!page) return res.status(404).json({ message: 'غير موجود' });

        if (status) page.status = status;
        if (allowedRole) page.allowedRole = allowedRole;

        await page.save();
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
