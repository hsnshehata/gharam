const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const syncController = require('../controllers/syncController');

router.get('/:collection', authenticate, syncController.pull);
router.post('/:collection/batch', authenticate, syncController.pushBatch);

module.exports = router;
