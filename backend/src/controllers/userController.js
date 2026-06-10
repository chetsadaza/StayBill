const User = require('../models/User');

// @desc    Get all users (admins)
// @route   GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a user
// @route   POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, isActive } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้วในระบบ' });
    }

    const user = await User.create({
      name,
      email,
      password,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user
// @route   PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้นี้' });
    }

    const { name, email, password, isActive } = req.body;

    // Check email uniqueness if email is changed
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้วในระบบ' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (password && password.trim() !== '') user.password = password; // pre-save will auto hash it
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้นี้' });
    }

    // Prevent deleting the last remaining admin
    const totalUsers = await User.countDocuments();
    if (totalUsers <= 1) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบบัญชีผู้ใช้สุดท้ายของระบบได้' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'ลบบัญชีผู้ใช้สำเร็จ' });
  } catch (error) {
    next(error);
  }
};
