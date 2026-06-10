const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบเพื่อใช้งาน'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'staybill-secret-key-dev');
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้ที่เชื่อมต่อกับ Token นี้'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้องหรือหมดอายุ'
    });
  }
};

module.exports = { protect };
