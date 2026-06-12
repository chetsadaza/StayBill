const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  billingMonth: {
    type: String,
    required: [true, 'กรุณาระบุเดือนที่เรียกเก็บ']
    // Format: "2026-06"
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },

  // ค่าน้ำ
  waterType: {
    type: String,
    enum: ['unit', 'flat', 'free'],
    default: 'unit'
  },
  waterPreviousMeter: { type: Number, default: 0 },
  waterCurrentMeter: { type: Number, default: 0 },
  waterUnits: { type: Number, default: 0 },
  waterRate: { type: Number, default: 0 },
  waterTotal: { type: Number, default: 0 },

  // ค่าไฟ
  electricityType: {
    type: String,
    enum: ['unit', 'flat', 'free'],
    default: 'unit'
  },
  electricityPreviousMeter: { type: Number, default: 0 },
  electricityCurrentMeter: { type: Number, default: 0 },
  electricityUnits: { type: Number, default: 0 },
  electricityRate: { type: Number, default: 0 },
  electricityTotal: { type: Number, default: 0 },

  // ค่าใช้จ่ายอื่นๆ
  additionalCharges: [{
    description: { type: String },
    amount: { type: Number, default: 0 }
  }],

  // ส่วนลดและหมายเหตุ
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  remarks: {
    type: String,
    default: ''
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  transRef: {
    type: String,
    default: null,
    index: true
  },
  slipUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate bills
billSchema.index({ room: 1, billingMonth: 1 }, { unique: true });

module.exports = mongoose.model('Bill', billSchema);
