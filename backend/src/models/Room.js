const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'กรุณาระบุเลขห้อง'],
    unique: true,
    trim: true
  },
  floor: {
    type: Number,
    required: [true, 'กรุณาระบุชั้น'],
    min: 1
  },
  type: {
    type: String,
    enum: ['single', 'double', 'suite'],
    default: 'single'
  },
  monthlyRent: {
    type: Number,
    required: [true, 'กรุณาระบุค่าเช่ารายเดือน'],
    min: 0
  },
  waterType: {
    type: String,
    enum: ['unit', 'flat', 'free'],
    default: 'unit'
  },
  waterRate: {
    type: Number,
    default: 18,
    min: 0
  },
  electricityType: {
    type: String,
    enum: ['unit', 'flat', 'free'],
    default: 'unit'
  },
  electricityRate: {
    type: Number,
    default: 8,
    min: 0
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);
