const express = require('express');
const balanceController = require('../controller/balanceController');

const router = express.Router();

router.post('/deposit/:userId', balanceController.clientDeposit);

module.exports = router;
