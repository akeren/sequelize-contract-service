const express = require('express');
const { getProfile } = require('../middleware/getProfile');
const contractController = require('../controller/contractController');

const router = express.Router();

router.use(getProfile);

router.get('/:id', contractController.getAContract);
router.get('/', contractController.getContracts);

module.exports = router;
