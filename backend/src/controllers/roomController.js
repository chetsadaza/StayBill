const Room = require('../models/Room');
const Tenant = require('../models/Tenant');

// @desc    Get all rooms
// @route   GET /api/rooms
exports.getRooms = async (req, res, next) => {
  try {
    const { status, floor } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (floor) filter.floor = Number(floor);

    const rooms = await Room.find(filter)
      .populate('tenant', 'firstName lastName phone')
      .sort({ roomNumber: 1 });

    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('tenant', 'firstName lastName phone idCard moveInDate');

    if (!room) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องพัก' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    Create room
// @route   POST /api/rooms
exports.createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'เลขห้องนี้มีอยู่แล้ว' });
    }
    next(error);
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องพัก' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'เลขห้องนี้มีอยู่แล้ว' });
    }
    next(error);
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องพัก' });
    }

    // If room has tenant, unlink tenant first
    if (room.tenant) {
      await Tenant.findByIdAndUpdate(room.tenant, { room: null, isActive: false });
    }

    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
