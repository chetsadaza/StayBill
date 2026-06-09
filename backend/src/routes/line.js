const express = require('express');
const router = express.Router();
const { handleWebhook, sendBillNotification, generateRegisterToken, sendBillImageNotification } = require('../controllers/lineController');

// Webhook endpoint
router.post('/webhook', handleWebhook);

// Generate LINE registration passcode for a tenant
router.post('/generate-token/:tenantId', generateRegisterToken);

// Send bill to tenant's LINE
router.post('/send-bill/:billId', sendBillNotification);

// Send bill image to tenant's LINE
router.post('/send-bill-image/:billId', sendBillImageNotification);

module.exports = router;
