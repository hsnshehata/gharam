const express = require('express');
const router = express.Router();
const packagesController = require('../controllers/packagesController');
const authenticate = require('../middleware/authenticate');

router.post('/package', authenticate, packagesController.addPackage);
router.put('/package/:id', authenticate, packagesController.updatePackage);
router.delete('/package/:id', authenticate, packagesController.deletePackage);
router.post('/service', authenticate, packagesController.addService);
router.put('/service/:id', authenticate, packagesController.updateService);
router.delete('/service/:id', authenticate, packagesController.deleteService);
router.get('/packages', authenticate, packagesController.getPackages);
router.get('/services', authenticate, packagesController.getServices);

module.exports = router;