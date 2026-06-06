const express = require('express');
const router = express.Router();
const { getTenants, getTenant, createTenant, updateTenant, deleteTenant } = require('../controllers/tenantController');
const { validateTenant } = require('../middleware/validation');

router.route('/')
  .get(getTenants)
  .post(validateTenant, createTenant);

router.route('/:id')
  .get(getTenant)
  .put(validateTenant, updateTenant)
  .delete(deleteTenant);

module.exports = router;
