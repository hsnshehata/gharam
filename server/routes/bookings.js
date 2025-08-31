const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, bookingsController.addBooking);
router.put('/:id', authenticate, bookingsController.updateBooking);
router.delete('/:id', authenticate, bookingsController.deleteBooking);
router.post('/:id/installment', authenticate, bookingsController.addInstallment);
router.get('/', authenticate, bookingsController.getBookings);
router.post('/execute-service/:id/:serviceId', authenticate, bookingsController.executeService);

module.exports = router;