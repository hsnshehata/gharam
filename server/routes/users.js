const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, usersController.addUser);
router.put('/:id', authenticate, usersController.updateUser);
router.delete('/:id', authenticate, usersController.deleteUser);
router.get('/', authenticate, usersController.getUsers);
router.post('/points', authenticate, usersController.addPoints);
router.get('/points/summary', authenticate, usersController.getPointsSummary);
router.post('/redeem-coins', authenticate, usersController.redeemCoins);

module.exports = router;