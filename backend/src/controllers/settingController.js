const Setting = require('../models/Setting');

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
