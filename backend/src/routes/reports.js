const express = require('express');
const router = express.Router();
const { getSummary, getRevenueReport } = require('../controllers/reportController');

router.get('/summary', getSummary);
router.get('/revenue', getRevenueReport);

module.exports = router;
