const Tenant = require('../models/Tenant');
const Room = require('../models/Room');

// @desc    Get all tenants
// @route   GET /api/tenants
exports.getTenants = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const tenants = await Tenant.find(filter)
      .populate('room', 'roomNumber floor status')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tenants.length, data: tenants });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tenant
// @route   GET /api/tenants/:id
exports.getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('room', 'roomNumber floor type monthlyRent status');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่า' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tenant & assign to room
// @route   POST /api/tenants
exports.createTenant = async (req, res, next) => {
  try {
    if (req.body.room === '') req.body.room = null;
    const tenant = await Tenant.create(req.body);

    // If room is assigned, update room status
    if (req.body.room) {
      await Room.findByIdAndUpdate(req.body.room, {
        status: 'occupied',
        tenant: tenant._id
      });
    }

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate('room', 'roomNumber floor status');

    res.status(201).json({ success: true, data: populatedTenant });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tenant
// @route   PUT /api/tenants/:id
exports.updateTenant = async (req, res, next) => {
  try {
    if (req.body.room === '') req.body.room = null;
    const oldTenant = await Tenant.findById(req.params.id);
    if (!oldTenant) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่า' });
    }

    // If room changed, update old room and new room
    if (req.body.room && req.body.room !== String(oldTenant.room)) {
      // Free old room
      if (oldTenant.room) {
        await Room.findByIdAndUpdate(oldTenant.room, {
          status: 'available',
          tenant: null
        });
      }
      // Assign new room
      await Room.findByIdAndUpdate(req.body.room, {
        status: 'occupied',
        tenant: oldTenant._id
      });
    }

    // If tenant is being deactivated (moved out)
    if (req.body.isActive === false && oldTenant.isActive === true) {
      if (oldTenant.room) {
        await Room.findByIdAndUpdate(oldTenant.room, {
          status: 'available',
          tenant: null
        });
      }
      req.body.moveOutDate = new Date();
      req.body.room = null;
    }

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('room', 'roomNumber floor status');

    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tenant
// @route   DELETE /api/tenants/:id
exports.deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่า' });
    }

    // Free the room
    if (tenant.room) {
      await Room.findByIdAndUpdate(tenant.room, {
        status: 'available',
        tenant: null
      });
    }

    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
