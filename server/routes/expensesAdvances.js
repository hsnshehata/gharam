const express = require('express');
const router = express.Router();
const expensesAdvancesController = require('../controllers/expensesAdvancesController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, expensesAdvancesController.addExpenseAdvance);
router.put('/:id', authenticate, expensesAdvancesController.updateExpenseAdvance);
router.delete('/:id', authenticate, expensesAdvancesController.deleteExpenseAdvance);
router.get('/', authenticate, expensesAdvancesController.getExpensesAdvances);

module.exports = router;