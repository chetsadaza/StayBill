const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'กรุณาระบุชื่อ'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'กรุณาระบุนามสกุล'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'กรุณาระบุเบอร์โทรศัพท์'],
    trim: true
  },
  idCard: {
    type: String,
    trim: true,
    default: ''
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  },
  moveInDate: {
    type: Date,
    default: Date.now
  },
  moveOutDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual: full name
tenantSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

tenantSchema.set('toJSON', { virtuals: true });
tenantSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tenant', tenantSchema);
