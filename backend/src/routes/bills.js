const express = require('express');
const router = express.Router();
const { getBills, getBill, generateBills, updateBill, payBill, deleteBill, verifySlip } = require('../controllers/billController');
const { validateBillGeneration } = require('../middleware/validation');

router.route('/')
  .get(getBills);

router.route('/generate')
  .post(validateBillGeneration, generateBills);

router.route('/:id')
  .get(getBill)
  .put(updateBill)
  .delete(deleteBill);

router.route('/:id/pay')
  .put(payBill);

router.route('/:id/verify-slip')
  .post(verifySlip);

module.exports = router;
