const mongoose = require('mongoose');

const slipVerificationLogSchema = new mongoose.Schema({
  transRef: {
    type: String,
    sparse: true,
    index: true
  },
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    default: null
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  amount: {
    type: Number,
    default: 0
  },
  senderName: {
    type: String,
    default: ''
  },
  receiverName: {
    type: String,
    default: ''
  },
  receiverAccount: {
    type: String,
    default: ''
  },
  transDate: {
    type: Date,
    default: null
  },
  success: {
    type: Boolean,
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  slipUrl: {
    type: String,
    default: null
  },
  source: {
    type: String,
    enum: ['line', 'admin'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SlipVerificationLog', slipVerificationLogSchema);
