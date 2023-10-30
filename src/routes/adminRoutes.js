const express = require('express');
const { validateDate } = require('../middleware/validateDate');
const adminController = require('../controller/adminController');

const router = express.Router();

router.use(validateDate);

router.get('/best-profession', adminController.bestProfession);
router.get('/best-clients', adminController.bestClients);

module.exports = router;
