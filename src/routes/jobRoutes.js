const express = require('express');
const { getProfile } = require('../middleware/getProfile');
const jobController = require('../controller/jobController');

const router = express.Router();

router.use(getProfile);

router.get('/unpaid', jobController.getUnpaidJobs);
router.post('/:job_id/pay', jobController.payForJob);

module.exports = router;
