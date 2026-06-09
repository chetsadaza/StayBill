const Bill = require('../models/Bill');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const { calculateWater, calculateElectricity, calculateTotal } = require('../utils/billCalculator');
const { getCurrentMonth } = require('../utils/helpers');

// @desc    Get all bills (filter by month)
// @route   GET /api/bills
exports.getBills = async (req, res, next) => {
  try {
    const { month, status } = req.query;
    const filter = {};
    if (month) filter.billingMonth = month;
    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName phone lineUserId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
exports.getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('room', 'roomNumber floor type monthlyRent')
      .populate('tenant', 'firstName lastName phone idCard lineUserId');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบบิล' });
    }

    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate bills for all occupied rooms
// @route   POST /api/bills/generate
exports.generateBills = async (req, res, next) => {
  try {
    const { billingMonth, meterReadings = [] } = req.body;
    const month = billingMonth || getCurrentMonth();

    // Get occupied rooms (filter by provided meterReadings if available)
    const filter = { status: 'occupied' };
    if (meterReadings && meterReadings.length > 0) {
      const roomIds = meterReadings.map(m => m.roomId);
      filter._id = { $in: roomIds };
    }
    const occupiedRooms = await Room.find(filter).populate('tenant');

    if (occupiedRooms.length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มีห้องพักที่ตรงตามเงื่อนไขเพื่อคำนวณบิล' });
    }

    const bills = [];
    const errors = [];

    for (const room of occupiedRooms) {
      try {
        // Check if bill already exists for this room/month
        const existingBill = await Bill.findOne({ room: room._id, billingMonth: month });
        if (existingBill) {
          errors.push(`ห้อง ${room.roomNumber}: มีบิลเดือน ${month} แล้ว`);
          continue;
        }

        // Find meter readings for this room
        const meterData = meterReadings.find(m => String(m.roomId) === String(room._id)) || {};

        // Calculate water
        const water = calculateWater(
          room.waterType,
          room.waterRate,
          meterData.waterPreviousMeter || 0,
          meterData.waterCurrentMeter || 0
        );

        // Calculate electricity
        const electricity = calculateElectricity(
          room.electricityType,
          room.electricityRate,
          meterData.electricityPreviousMeter || 0,
          meterData.electricityCurrentMeter || 0
        );

        const additionalCharges = meterData.additionalCharges || [];
        const discount = meterData.discount || 0;
        const remarks = meterData.remarks || '';

        // Calculate total
        const totalAmount = calculateTotal(
          room.monthlyRent,
          water.total,
          electricity.total,
          additionalCharges,
          discount
        );

        const bill = await Bill.create({
          room: room._id,
          tenant: room.tenant._id,
          billingMonth: month,
          monthlyRent: room.monthlyRent,

          waterType: room.waterType,
          waterPreviousMeter: meterData.waterPreviousMeter || 0,
          waterCurrentMeter: meterData.waterCurrentMeter || 0,
          waterUnits: water.units,
          waterRate: room.waterRate,
          waterTotal: water.total,

          electricityType: room.electricityType,
          electricityPreviousMeter: meterData.electricityPreviousMeter || 0,
          electricityCurrentMeter: meterData.electricityCurrentMeter || 0,
          electricityUnits: electricity.units,
          electricityRate: room.electricityRate,
          electricityTotal: electricity.total,

          additionalCharges,
          discount,
          remarks,
          totalAmount,
          status: 'pending'
        });

        bills.push(bill);
      } catch (err) {
        errors.push(`ห้อง ${room.roomNumber}: ${err.message}`);
      }
    }

    const populatedBills = await Bill.find({ _id: { $in: bills.map(b => b._id) } })
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName phone lineUserId');

    res.status(201).json({
      success: true,
      count: populatedBills.length,
      data: populatedBills,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bill (edit meter readings, etc.)
// @route   PUT /api/bills/:id
exports.updateBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบบิล' });
    }

    // Recalculate if meter readings, charges, rent or discount changed
    if (
      req.body.waterCurrentMeter !== undefined || 
      req.body.electricityCurrentMeter !== undefined ||
      req.body.waterPreviousMeter !== undefined ||
      req.body.electricityPreviousMeter !== undefined ||
      req.body.additionalCharges !== undefined ||
      req.body.monthlyRent !== undefined ||
      req.body.discount !== undefined
    ) {
      const waterType = req.body.waterType || bill.waterType;
      const waterRate = req.body.waterRate || bill.waterRate;
      const waterPrev = req.body.waterPreviousMeter !== undefined ? req.body.waterPreviousMeter : bill.waterPreviousMeter;
      const waterCurr = req.body.waterCurrentMeter !== undefined ? req.body.waterCurrentMeter : bill.waterCurrentMeter;

      const water = calculateWater(waterType, waterRate, waterPrev, waterCurr);
      req.body.waterUnits = water.units;
      req.body.waterTotal = water.total;

      const elecType = req.body.electricityType || bill.electricityType;
      const elecRate = req.body.electricityRate || bill.electricityRate;
      const elecPrev = req.body.electricityPreviousMeter !== undefined ? req.body.electricityPreviousMeter : bill.electricityPreviousMeter;
      const elecCurr = req.body.electricityCurrentMeter !== undefined ? req.body.electricityCurrentMeter : bill.electricityCurrentMeter;

      const electricity = calculateElectricity(elecType, elecRate, elecPrev, elecCurr);
      req.body.electricityUnits = electricity.units;
      req.body.electricityTotal = electricity.total;

      const rent = req.body.monthlyRent || bill.monthlyRent;
      const additionalCharges = req.body.additionalCharges || bill.additionalCharges;
      const discount = req.body.discount !== undefined ? req.body.discount : bill.discount;
      req.body.totalAmount = calculateTotal(rent, water.total, electricity.total, additionalCharges, discount);
    }

    const updatedBill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName phone lineUserId');

    res.json({ success: true, data: updatedBill });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark bill as paid
// @route   PUT /api/bills/:id/pay
exports.payBill = async (req, res, next) => {
  try {
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      {
        isPaid: true,
        paidDate: new Date(),
        status: 'paid'
      },
      { new: true }
    )
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName phone lineUserId');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบบิล' });
    }

    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bill
// @route   DELETE /api/bills/:id
exports.deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบบิล' });
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
