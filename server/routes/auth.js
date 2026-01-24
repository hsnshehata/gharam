const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
const authenticate = require('../middleware/authenticate');
router.get('/me', authenticate, authController.me);

module.exports = router;