const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  dormitoryName: {
    type: String,
    default: 'หอพัก StayBill'
  },
  address: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  defaultWaterRate: {
    type: Number,
    default: 18
  },
  defaultElectricityRate: {
    type: Number,
    default: 8
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
