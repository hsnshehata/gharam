const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, usersController.addUser);
router.put('/:id', authenticate, usersController.updateUser);
router.delete('/:id', authenticate, usersController.deleteUser);
router.get('/', authenticate, usersController.getUsers);
router.post('/reset-salaries', authenticate, usersController.resetSalaries);
router.post('/gift', authenticate, usersController.giftPoints);
router.post('/gift/bulk', authenticate, usersController.giftPointsBulk);
router.post('/deduct', authenticate, usersController.deductPoints);
router.get('/gifts/pending', authenticate, usersController.listPendingGifts);
router.get('/gifts/today', authenticate, usersController.listTodayGifts);
router.post('/gifts/open/:giftId', authenticate, usersController.openGift);
router.post('/points', authenticate, usersController.addPoints);
router.get('/points/summary', authenticate, usersController.getPointsSummary);
router.get('/executed-services', authenticate, usersController.getExecutedServices);
router.post('/convert-points', authenticate, usersController.convertPointsToCoins);
router.post('/redeem-coins', authenticate, usersController.redeemCoins);

module.exports = router;
