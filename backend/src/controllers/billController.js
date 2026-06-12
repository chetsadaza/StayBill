const Bill = require('../models/Bill');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const SlipVerificationLog = require('../models/SlipVerificationLog');
const { calculateWater, calculateElectricity, calculateTotal } = require('../utils/billCalculator');
const { getCurrentMonth, verifySlipWithSlipOk, parseSlipDate } = require('../utils/helpers');
const { sendPaymentNotification } = require('./lineController');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Concurrency lock sets for admin verify
const processingAdminRefs = new Set();
const processingAdminBills = new Set();


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

    // ส่งข้อความแจ้งเตือนการจ่ายเงินสำเร็จไปยัง LINE ของผู้เช่า
    sendPaymentNotification(bill._id).catch(err => {
      console.error('Failed to send payment LINE notification:', err);
    });

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

// @desc    Verify bank transfer slip and mark bill as paid
// @route   POST /api/bills/:id/verify-slip
exports.verifySlip = async (req, res, next) => {
  const billId = req.params.id;

  // Lock bill during processing to avoid race conditions
  if (processingAdminBills.has(billId)) {
    return res.status(400).json({ success: false, message: 'บิลนี้กำลังอยู่ในกระบวนการตรวจสอบสลิป กรุณารอสักครู่' });
  }
  processingAdminBills.add(billId);

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งไฟล์รูปภาพสลิป' });
    }

    const bill = await Bill.findById(billId)
      .populate('room')
      .populate('tenant');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบบิลที่ระบุ' });
    }

    if (bill.isPaid) {
      return res.status(400).json({ success: false, message: 'บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว' });
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Save image to storage
    const uploadDir = path.join(__dirname, '../../public/uploads/slips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `slip-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // Get base URL for URL construction
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const backendUrl = `${protocol}://${req.get('host')}`;
    const slipUrl = `${backendUrl}/uploads/slips/${filename}`;

    // Call SlipOK API
    const slipResult = await verifySlipWithSlipOk(imageBuffer);

    if (!slipResult.success || !slipResult.data) {
      // Log failed verification
      await SlipVerificationLog.create({
        bill: bill._id,
        room: bill.room?._id,
        tenant: bill.tenant?._id,
        success: false,
        errorMessage: `ตรวจสอบสลิปไม่สำเร็จ: ${slipResult.message || 'ข้อมูลสลิปไม่ถูกต้อง'}`,
        slipUrl,
        source: 'admin'
      });

      return res.status(400).json({ 
        success: false, 
        message: `ตรวจสอบสลิปไม่สำเร็จ: ${slipResult.message || 'ข้อมูลสลิปไม่ถูกต้อง หรือไม่พบ QR Code บนสลิป'}` 
      });
    }

    const transRef = slipResult.data.transRef;
    const slipAmount = Number(slipResult.data.amount);
    const actualReceiverName = slipResult.data.receiver?.displayName || '';
    const actualReceiverAccount = slipResult.data.receiver?.account?.value || '';

    // Lock transaction reference to prevent duplicate spending
    if (transRef && processingAdminRefs.has(transRef)) {
      return res.status(400).json({ success: false, message: 'รหัสธุรกรรมนี้กำลังอยู่ระหว่างการประมวลผล' });
    }
    if (transRef) processingAdminRefs.add(transRef);

    try {
      // Check for duplicate in DB
      if (transRef) {
        const existingBill = await Bill.findOne({ transRef });
        const existingLog = await SlipVerificationLog.findOne({ transRef, success: true });
        if (existingBill || existingLog) {
          await SlipVerificationLog.create({
            transRef,
            bill: bill._id,
            room: bill.room?._id,
            tenant: bill.tenant?._id,
            amount: slipAmount,
            senderName: slipResult.data.sender?.displayName || '',
            receiverName: actualReceiverName,
            receiverAccount: actualReceiverAccount,
            transDate: parseSlipDate(slipResult.data),
            success: false,
            errorMessage: 'พบสลิปโอนเงินรหัสธุรกรรมนี้ซ้ำในระบบ (สลิปโอนซ้ำ)',
            slipUrl,
            source: 'admin'
          });

          return res.status(400).json({
            success: false,
            message: `สลิปโอนเงินนี้เคยใช้ยืนยันยอดชำระไปแล้วในระบบ (รหัสธุรกรรม: ${transRef}) ไม่สามารถใช้ซ้ำได้`
          });
        }
      }

      // Verify bank account recipient
      const expectedReceiverName = process.env.SLIPOK_RECEIVER_NAME;
      const expectedReceiverAccount = process.env.SLIPOK_RECEIVER_ACCOUNT;
      let receiverValid = true;
      let invalidReason = '';

      if (expectedReceiverName && !actualReceiverName.includes(expectedReceiverName)) {
        receiverValid = false;
        invalidReason = `บัญชีผู้รับเงินปลายทางไม่ตรงกับหอพัก (โอนไปที่: ${actualReceiverName})`;
      }
      if (expectedReceiverAccount && actualReceiverAccount) {
        const cleanActual = actualReceiverAccount.replace(/-/g, '');
        const cleanExpected = expectedReceiverAccount.replace(/-/g, '');
        if (!cleanActual.includes(cleanExpected)) {
          receiverValid = false;
          invalidReason = `เลขบัญชี/PromptPay ปลายทางไม่ตรงกับหอพัก (โอนไปที่: ${actualReceiverAccount})`;
        }
      }

      if (!receiverValid) {
        await SlipVerificationLog.create({
          transRef,
          bill: bill._id,
          room: bill.room?._id,
          tenant: bill.tenant?._id,
          amount: slipAmount,
          senderName: slipResult.data.sender?.displayName || '',
          receiverName: actualReceiverName,
          receiverAccount: actualReceiverAccount,
          transDate: parseSlipDate(slipResult.data),
          success: false,
          errorMessage: invalidReason,
          slipUrl,
          source: 'admin'
        });

        return res.status(400).json({
          success: false,
          message: `บัญชีปลายทางผู้รับเงินในสลิปไม่ตรงกับบัญชีของหอพัก (โอนไปที่: ${actualReceiverName || '-'})`
        });
      }

      // Verify amount
      const billAmount = Number(bill.totalAmount);
      if (Math.abs(slipAmount - billAmount) > 0.01) {
        await SlipVerificationLog.create({
          transRef,
          bill: bill._id,
          room: bill.room?._id,
          tenant: bill.tenant?._id,
          amount: slipAmount,
          senderName: slipResult.data.sender?.displayName || '',
          receiverName: actualReceiverName,
          receiverAccount: actualReceiverAccount,
          transDate: parseSlipDate(slipResult.data),
          success: false,
          errorMessage: `ยอดเงินในสลิป (฿${slipAmount}) ไม่ตรงกับยอดเรียกเก็บของบิลนี้ (฿${billAmount})`,
          slipUrl,
          source: 'admin'
        });

        return res.status(400).json({
          success: false,
          message: `ยอดเงินในสลิป (฿${slipAmount.toLocaleString()}) ไม่ตรงกับยอดเรียกเก็บของบิลนี้ (฿${billAmount.toLocaleString()})`
        });
      }

      // Update Bill
      bill.isPaid = true;
      bill.paidDate = parseSlipDate(slipResult.data) || new Date();
      bill.status = 'paid';
      bill.transRef = transRef;
      bill.slipUrl = slipUrl;
      if (transRef) {
        bill.remarks = bill.remarks 
          ? `${bill.remarks} (โอนผ่านแอดมินอัปโหลดสลิป Ref: ${transRef})`
          : `โอนผ่านแอดมินอัปโหลดสลิป Ref: ${transRef}`;
      }
      await bill.save();

      // Log successful verification
      await SlipVerificationLog.create({
        transRef,
        bill: bill._id,
        room: bill.room?._id,
        tenant: bill.tenant?._id,
        amount: slipAmount,
        senderName: slipResult.data.sender?.displayName || '',
        receiverName: actualReceiverName,
        receiverAccount: actualReceiverAccount,
        transDate: parseSlipDate(slipResult.data),
        success: true,
        slipUrl,
        source: 'admin'
      });

      // Send payment confirmation LINE notification (Flex Message)
      sendPaymentNotification(bill._id).catch(err => {
        console.error('Failed to send payment LINE notification:', err);
      });

      res.json({
        success: true,
        message: 'ตรวจสอบสลิปและบันทึกการชำระเงินสำเร็จ',
        data: {
          amount: slipAmount,
          sender: slipResult.data.sender?.displayName || '',
          receiver: actualReceiverName,
          transDate: slipResult.data.transDate,
          transRef: transRef
        }
      });

    } finally {
      if (transRef) processingAdminRefs.delete(transRef);
    }

  } catch (error) {
    next(error);
  } finally {
    processingAdminBills.delete(billId);
  }
};

