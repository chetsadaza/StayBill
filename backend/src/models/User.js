const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'กรุณาระบุชื่อ'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'กรุณาระบุอีเมล'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'กรุณาระบุรหัสผ่าน']
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save hook to hash password natively using scrypt
userSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedBuffer = crypto.scryptSync(this.password, salt, 64);
    this.password = `${salt}:${hashedBuffer.toString('hex')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Method to verify password
userSchema.methods.matchPassword = function(enteredPassword) {
  try {
    const parts = this.password.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const hashedBuffer = crypto.scryptSync(enteredPassword, salt, 64);
    return key === hashedBuffer.toString('hex');
  } catch (err) {
    console.error('Password match error:', err);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
