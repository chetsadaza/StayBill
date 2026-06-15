const Setting = require('../models/Setting');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// @desc    Get settings
// @route   GET /api/settings
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await Setting.create({
        dormitoryName: 'หอพัก StayBill',
        address: '',
        phone: '',
        defaultWaterRate: 18,
        defaultElectricityRate: 8
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update settings
// @route   PUT /api/settings
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      settings = await Setting.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload payment QR code image
// @route   POST /api/settings/upload-qr
exports.uploadQrImage = async (req, res, next) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งไฟล์รูปภาพ QR Code' });
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, '../../public/uploads/qr');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Delete old QR image if exists
    const settings = await Setting.findOne();
    if (settings && settings.paymentQrImage) {
      const oldFilename = settings.paymentQrImage.split('/').pop();
      const oldPath = path.join(uploadDir, oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new image
    const ext = imageBase64.match(/^data:image\/(\w+);/) ? imageBase64.match(/^data:image\/(\w+);/)[1] : 'png';
    const filename = `qr-payment-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // Build public URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const backendUrl = `${protocol}://${req.get('host')}`;
    const qrImageUrl = `${backendUrl}/uploads/qr/${filename}`;

    // Update setting
    let updatedSettings;
    if (!settings) {
      updatedSettings = await Setting.create({ paymentQrImage: qrImageUrl });
    } else {
      updatedSettings = await Setting.findByIdAndUpdate(
        settings._id,
        { paymentQrImage: qrImageUrl },
        { new: true }
      );
    }

    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment QR code image
// @route   DELETE /api/settings/upload-qr
exports.deleteQrImage = async (req, res, next) => {
  try {
    const settings = await Setting.findOne();
    if (!settings || !settings.paymentQrImage) {
      return res.status(404).json({ success: false, message: 'ไม่พบรูป QR Code ในระบบ' });
    }

    // Delete file from disk
    const uploadDir = path.join(__dirname, '../../public/uploads/qr');
    const oldFilename = settings.paymentQrImage.split('/').pop();
    const oldPath = path.join(uploadDir, oldFilename);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    // Clear from setting
    settings.paymentQrImage = '';
    await settings.save();

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
