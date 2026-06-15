const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, uploadQrImage, deleteQrImage } = require('../controllers/settingController');

router.route('/')
  .get(getSettings)
  .put(updateSettings);

router.route('/upload-qr')
  .post(uploadQrImage)
  .delete(deleteQrImage);

module.exports = router;
