const express = require('express');
const router = express.Router();
const instantServicesController = require('../controllers/instantServicesController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, instantServicesController.addInstantService);
router.put('/:id', authenticate, instantServicesController.updateInstantService);
router.delete('/:id', authenticate, instantServicesController.deleteInstantService);
router.get('/', authenticate, instantServicesController.getInstantServices);
router.post('/execute-service/:id/:serviceId', authenticate, instantServicesController.executeService);
router.post('/reset-service/:id/:serviceId', authenticate, instantServicesController.resetService);

module.exports = router;