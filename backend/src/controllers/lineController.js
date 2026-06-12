const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Tenant = require('../models/Tenant');
const Bill = require('../models/Bill');
const SlipVerificationLog = require('../models/SlipVerificationLog');
const { verifySlipWithSlipOk, parseSlipDate } = require('../utils/helpers');

// Lock sets for slip concurrency control
const processingUsers = new Set();
const processingRefs = new Set();

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// ==============================
// Helper: ส่งข้อความผ่าน LINE Messaging API
// ==============================
async function linePush(to, messages) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ to, messages })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('LINE Push Error:', err);
    throw new Error(err.message || 'ส่งข้อความ LINE ไม่สำเร็จ');
  }
  return res.json();
}

async function lineReply(replyToken, messages) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('LINE Reply Error:', err);
  }
}

// ==============================
// Verify LINE Signature
// ==============================
function verifySignature(body, signature) {
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// ==============================
// @desc    Handle LINE Webhook events
// @route   POST /api/line/webhook
// ==============================
exports.handleWebhook = async (req, res) => {
  // ตรวจสอบ signature
  const signature = req.headers['x-line-signature'];
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && (!signature || !verifySignature(req.rawBody, signature))) {
    console.warn('Invalid LINE webhook signature');
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  const events = req.body.events || [];
  res.status(200).json({ success: true }); // ตอบ LINE กลับทันที

  // ประมวลผล events แบบ async
  for (const event of events) {
    try {
      if (event.type === 'follow') {
        // ผู้ใช้แอดเพื่อน / follow บอท
        await lineReply(event.replyToken, [{
          type: 'text',
          text: '🏠 ยินดีต้อนรับเข้าสู่ระบบแจ้งหนี้ StayBill!\n\nกรุณาพิมพ์ «รหัสยืนยัน 6 หลัก» ที่ได้รับจากผู้ดูแลหอพัก เพื่อเชื่อมต่อบัญชี LINE ของคุณกับห้องพักค่ะ\n\nตัวอย่าง: 482910'
        }]);
      } else if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        const lineUserId = event.source.userId;

        // ตรวจว่าเป็นรหัส 6 หลักหรือไม่
        if (/^\d{6}$/.test(text)) {
          // ค้นหาผู้เช่าที่มีรหัสตรงกันและยังไม่หมดอายุ
          const tenant = await Tenant.findOne({
            lineRegisterToken: text,
            lineRegisterTokenExpires: { $gt: new Date() }
          }).populate('room', 'roomNumber');

          if (tenant) {
            // บันทึก LINE User ID
            tenant.lineUserId = lineUserId;
            tenant.lineRegisterToken = null;
            tenant.lineRegisterTokenExpires = null;
            await tenant.save();

            const roomInfo = tenant.room ? `ห้อง ${tenant.room.roomNumber}` : 'ห้องพักของคุณ';
            await lineReply(event.replyToken, [{
              type: 'text',
              text: `✅ เชื่อมต่อสำเร็จ!\n\nคุณ ${tenant.firstName} ${tenant.lastName}\n${roomInfo}\n\nตอนนี้คุณจะได้รับใบแจ้งหนี้ค่าเช่าผ่าน LINE โดยอัตโนมัติแล้วค่ะ 🎉`
            }]);
          } else {
            await lineReply(event.replyToken, [{
              type: 'text',
              text: '❌ รหัสไม่ถูกต้องหรือหมดอายุแล้ว\n\nกรุณาติดต่อผู้ดูแลหอพักเพื่อขอรหัสใหม่ค่ะ'
            }]);
          }
        } else {
          // ข้อความอื่นๆ
          // ตรวจว่าผู้ใช้เชื่อมบัญชีแล้วหรือยัง
          const linked = await Tenant.findOne({ lineUserId });
          if (linked) {
            await lineReply(event.replyToken, [{
              type: 'text',
              text: `สวัสดีค่ะ คุณ ${linked.firstName}! 😊\n\nบัญชี LINE ของคุณเชื่อมต่อกับระบบเรียบร้อยแล้ว\nคุณจะได้รับใบแจ้งหนี้อัตโนมัติทุกเดือนค่ะ`
            }]);
          } else {
            await lineReply(event.replyToken, [{
              type: 'text',
              text: '🏠 ระบบแจ้งหนี้ StayBill\n\nกรุณาพิมพ์ «รหัสยืนยัน 6 หลัก» เพื่อเชื่อมบัญชีค่ะ\n\nหากยังไม่มีรหัส กรุณาติดต่อผู้ดูแลหอพัก'
            }]);
          }
        }
      } else if (event.type === 'message' && event.message.type === 'image') {
        const lineUserId = event.source.userId;
        const messageId = event.message.id;

        // Concurrency lock: check if user is already verifying a slip
        if (processingUsers.has(lineUserId)) {
          await lineReply(event.replyToken, [{
            type: 'text',
            text: '⏳ ระบบกำลังตรวจสอบสลิปก่อนหน้านี้ของคุณ กรุณารอสักครู่ค่ะ'
          }]);
          continue;
        }
        processingUsers.add(lineUserId);

        try {
          // Check if tenant is linked
          const tenant = await Tenant.findOne({ lineUserId }).populate('room');
          if (!tenant) {
            await lineReply(event.replyToken, [{
              type: 'text',
              text: '🏠 ระบบแจ้งหนี้ StayBill\n\nบัญชี LINE ของคุณยังไม่ได้ผูกกับห้องพัก กรุณาพิมพ์ «รหัสยืนยัน 6 หลัก» ที่ได้รับจากผู้ดูแลหอพักเพื่อเชื่อมต่อค่ะ'
            }]);
            continue;
          }

          // Download image from LINE Content API
          const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
            headers: {
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            }
          });

          if (!imageRes.ok) {
            throw new Error(`LINE image download failed with status ${imageRes.status}`);
          }

          const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

          // Save image to storage
          const uploadDir = path.join(__dirname, '../../public/uploads/slips');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filename = `slip-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, imageBuffer);

          const protocol = req.headers['x-forwarded-proto'] || req.protocol;
          const backendUrl = `${protocol}://${req.get('host')}`;
          const slipUrl = `${backendUrl}/uploads/slips/${filename}`;

          // Verify slip with SlipOK
          const slipResult = await verifySlipWithSlipOk(imageBuffer);

          if (!slipResult.success || !slipResult.data) {
            // Log failed scan
            await SlipVerificationLog.create({
              room: tenant.room?._id,
              tenant: tenant._id,
              success: false,
              errorMessage: `ตรวจสลิปไม่สำเร็จ: ${slipResult.message || 'ข้อมูลสลิปไม่ถูกต้องหรือสแกน QR Code ไม่พบ'}`,
              slipUrl,
              source: 'line'
            });

            await lineReply(event.replyToken, [{
              type: 'text',
              text: `❌ ตรวจสอบสลิปไม่สำเร็จ: ${slipResult.message || 'ข้อมูลสลิปไม่ถูกต้อง หรือไม่พบ QR Code ในรูปภาพสลิป'}`
            }]);
            continue;
          }

          const transRef = slipResult.data.transRef;
          const slipAmount = Number(slipResult.data.amount);
          const actualReceiverName = slipResult.data.receiver?.displayName || '';
          const actualReceiverAccount = slipResult.data.receiver?.account?.value || '';

          // Lock transaction reference to prevent double spend
          if (transRef && processingRefs.has(transRef)) {
            await lineReply(event.replyToken, [{
              type: 'text',
              text: '⏳ สลิปหมายเลขธุรกรรมนี้กำลังได้รับการประมวลผล กรุณารอผลสักครู่ค่ะ'
            }]);
            continue;
          }
          if (transRef) processingRefs.add(transRef);

          try {
            // Check for duplicate in DB
            if (transRef) {
              const existingBill = await Bill.findOne({ transRef });
              const existingLog = await SlipVerificationLog.findOne({ transRef, success: true });
              if (existingBill || existingLog) {
                await SlipVerificationLog.create({
                  transRef,
                  room: tenant.room?._id,
                  tenant: tenant._id,
                  amount: slipAmount,
                  senderName: slipResult.data.sender?.displayName || '',
                  receiverName: actualReceiverName,
                  receiverAccount: actualReceiverAccount,
                  transDate: parseSlipDate(slipResult.data),
                  success: false,
                  errorMessage: 'พบสลิปโอนเงินรหัสธุรกรรมนี้ซ้ำในระบบ (สลิปโอนซ้ำ)',
                  slipUrl,
                  source: 'line'
                });

                await lineReply(event.replyToken, [{
                  type: 'text',
                  text: `❌ สลิปโอนเงินนี้เคยใช้ยืนยันยอดชำระไปแล้วค่ะ (รหัสธุรกรรม: ${transRef})\n\nระบบไม่สามารถอนุมัติรายการซ้ำได้ หากมีข้อผิดพลาดกรุณาติดต่อผู้ดูแลค่ะ`
                }]);
                continue;
              }
            }

            // Verify receiving bank account
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
                room: tenant.room?._id,
                tenant: tenant._id,
                amount: slipAmount,
                senderName: slipResult.data.sender?.displayName || '',
                receiverName: actualReceiverName,
                receiverAccount: actualReceiverAccount,
                transDate: slipResult.data.transDate ? new Date(slipResult.data.transDate) : null,
                success: false,
                errorMessage: invalidReason,
                slipUrl,
                source: 'line'
              });

              await lineReply(event.replyToken, [{
                type: 'text',
                text: `❌ บัญชีปลายทางผู้รับเงินในสลิปไม่ตรงกับบัญชีของหอพักค่ะ\n\nโอนไปที่: ${actualReceiverName || '-'}\n\nกรุณาตรวจสอบและใช้บัญชีที่ถูกต้องของหอพักในการโอนเงินนะคะ`
              }]);
              continue;
            }

            // Dynamic Bill Matching
            const bills = await Bill.find({
              room: tenant.room?._id,
              isPaid: false
            }).sort({ createdAt: 1 });

            if (bills.length === 0) {
              await SlipVerificationLog.create({
                transRef,
                room: tenant.room?._id,
                tenant: tenant._id,
                amount: slipAmount,
                senderName: slipResult.data.sender?.displayName || '',
                receiverName: actualReceiverName,
                receiverAccount: actualReceiverAccount,
                transDate: parseSlipDate(slipResult.data),
                success: false,
                errorMessage: 'ไม่พบยอดบิลค้างชำระสำหรับห้องนี้ในระบบ',
                slipUrl,
                source: 'line'
              });

              await lineReply(event.replyToken, [{
                type: 'text',
                text: `📢 ไม่พบยอดบิลค้างชำระสำหรับห้อง ${tenant.room?.roomNumber || '-'} ในระบบค่ะ`
              }]);
              continue;
            }

            // Find bill matching the amount
            const matchedBill = bills.find(b => Math.abs(Number(b.totalAmount) - slipAmount) <= 0.01);

            if (!matchedBill) {
              await SlipVerificationLog.create({
                transRef,
                room: tenant.room?._id,
                tenant: tenant._id,
                amount: slipAmount,
                senderName: slipResult.data.sender?.displayName || '',
                receiverName: actualReceiverName,
                receiverAccount: actualReceiverAccount,
                transDate: parseSlipDate(slipResult.data),
                success: false,
                errorMessage: `ยอดเงินโอน (฿${slipAmount}) ไม่ตรงกับบิลค้างชำระใดๆ ของห้องนี้`,
                slipUrl,
                source: 'line'
              });

              const billAmountsStr = bills.map(b => `฿${b.totalAmount.toLocaleString('th-TH')}`).join(' หรือ ');
              await lineReply(event.replyToken, [{
                type: 'text',
                text: `❌ ยอดเงินโอนไม่ตรงกับยอดในระบบค่ะ\n\n- ยอดในสลิป: ฿${slipAmount.toLocaleString('th-TH')}\n- ยอดค้างชำระของคุณ: ${billAmountsStr}\n\nกรุณาตรวจสอบอีกครั้งค่ะ`
              }]);
              continue;
            }

            // Mark bill as paid
            matchedBill.isPaid = true;
            matchedBill.paidDate = parseSlipDate(slipResult.data) || new Date();
            matchedBill.status = 'paid';
            matchedBill.transRef = transRef;
            matchedBill.slipUrl = slipUrl;
            if (transRef) {
              matchedBill.remarks = matchedBill.remarks 
                ? `${matchedBill.remarks} (โอนผ่าน LINE Ref: ${transRef})`
                : `โอนผ่าน LINE Ref: ${transRef}`;
            }
            await matchedBill.save();

            // Log successful verification
            await SlipVerificationLog.create({
              transRef,
              bill: matchedBill._id,
              room: tenant.room?._id,
              tenant: tenant._id,
              amount: slipAmount,
              senderName: slipResult.data.sender?.displayName || '',
              receiverName: actualReceiverName,
              receiverAccount: actualReceiverAccount,
              transDate: parseSlipDate(slipResult.data),
              success: true,
              slipUrl,
              source: 'line'
            });

            // Trigger Flex message receipt
            await exports.sendPaymentNotification(matchedBill._id);

          } finally {
            if (transRef) processingRefs.delete(transRef);
          }

        } catch (err) {
          console.error('Error processing LINE slip verification:', err);
          try {
            await SlipVerificationLog.create({
              success: false,
              errorMessage: `ระบบล้มเหลว (System Exception): ${err.message}\n${err.stack}`,
              source: 'line'
            });
          } catch (logErr) {
            console.error('Failed to write error log to DB:', logErr);
          }
          await lineReply(event.replyToken, [{
            type: 'text',
            text: `❌ เกิดข้อผิดพลาดในระบบตรวจสลิปชั่วคราว: ${err.message}\n\nกรุณาติดต่อแอดมินหรือส่งสลิปใหม่อีกครั้งค่ะ`
          }]);
        } finally {
          processingUsers.delete(lineUserId);
        }
      }
    } catch (err) {
      console.error('Error processing LINE event:', err);
    }
  }
};

// ==============================
// @desc    Generate 6-digit register token for tenant
// @route   POST /api/line/generate-token/:tenantId
// ==============================
exports.generateRegisterToken = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้เช่า' });
    }

    // สร้างรหัส 6 หลักที่ไม่ซ้ำ
    let token;
    let isUnique = false;
    while (!isUnique) {
      token = String(Math.floor(100000 + Math.random() * 900000));
      const existing = await Tenant.findOne({
        lineRegisterToken: token,
        lineRegisterTokenExpires: { $gt: new Date() }
      });
      if (!existing) isUnique = true;
    }

    // ตั้งอายุ 15 นาที
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    tenant.lineRegisterToken = token;
    tenant.lineRegisterTokenExpires = expires;
    await tenant.save();

    res.json({
      success: true,
      data: {
        token,
        expiresAt: expires,
        tenantName: `${tenant.firstName} ${tenant.lastName}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// @desc    Send bill notification to tenant's LINE
// @route   POST /api/line/send-bill/:billId
// ==============================
exports.sendBillNotification = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.billId)
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName lineUserId');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลบิล' });
    }

    if (!bill.tenant || !bill.tenant.lineUserId) {
      return res.status(400).json({ success: false, message: 'ผู้เช่ารายนี้ยังไม่ได้เชื่อมต่อ LINE' });
    }

    const lineUserId = bill.tenant.lineUserId;
    const tenantName = `${bill.tenant.firstName} ${bill.tenant.lastName}`;
    const roomNumber = bill.room?.roomNumber || '-';
    const billingMonth = bill.billingMonth; // "2026-06"
    const [year, month] = billingMonth.split('-');
    const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiMonth = `${thaiMonths[parseInt(month)]} ${parseInt(year) + 543}`;
    const totalAmount = bill.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const billDetailUrl = `${APP_BASE_URL}/share/bill/${bill._id}`;

    // สร้าง Flex Message Card สวยงาม
    const flexMessage = {
      type: 'flex',
      altText: `ใบแจ้งหนี้ค่าเช่า ห้อง ${roomNumber} ประจำเดือน ${thaiMonth} — ยอดรวม ฿${totalAmount}`,
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#4f46e5',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '📋 ใบแจ้งหนี้ค่าเช่า',
              color: '#FFFFFF',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: `ประจำเดือน ${thaiMonth}`,
              color: '#C7D2FE',
              size: 'sm',
              margin: 'sm'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ผู้เช่า', color: '#8b8b8b', size: 'sm', flex: 3 },
                { type: 'text', text: tenantName, weight: 'bold', size: 'sm', flex: 5, align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ห้องพัก', color: '#8b8b8b', size: 'sm', flex: 3 },
                { type: 'text', text: `ห้อง ${roomNumber}`, weight: 'bold', size: 'sm', flex: 5, align: 'end' }
              ]
            },
            { type: 'separator', margin: 'lg' },
            // รายการค่าใช้จ่าย
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                { type: 'text', text: 'ค่าเช่าห้อง', color: '#555555', size: 'sm', flex: 5 },
                { type: 'text', text: `฿${bill.monthlyRent.toLocaleString()}`, size: 'sm', flex: 3, align: 'end' }
              ]
            },
            ...(bill.waterTotal > 0 ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `ค่าน้ำ${bill.waterType === 'unit' ? ` (${bill.waterUnits} หน่วย)` : ''}`, color: '#555555', size: 'sm', flex: 5 },
                { type: 'text', text: `฿${bill.waterTotal.toLocaleString()}`, size: 'sm', flex: 3, align: 'end' }
              ]
            }] : []),
            ...(bill.electricityTotal > 0 ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `ค่าไฟ${bill.electricityType === 'unit' ? ` (${bill.electricityUnits} หน่วย)` : ''}`, color: '#555555', size: 'sm', flex: 5 },
                { type: 'text', text: `฿${bill.electricityTotal.toLocaleString()}`, size: 'sm', flex: 3, align: 'end' }
              ]
            }] : []),
            ...(bill.additionalCharges && bill.additionalCharges.length > 0 ? bill.additionalCharges.map(c => ({
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: c.description || 'ค่าบริการเสริม', color: '#555555', size: 'sm', flex: 5 },
                { type: 'text', text: `฿${(c.amount || 0).toLocaleString()}`, size: 'sm', flex: 3, align: 'end' }
              ]
            })) : []),
            ...(bill.discount > 0 ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `ส่วนลด${bill.remarks ? ` (${bill.remarks})` : ''}`, color: '#ef4444', size: 'sm', flex: 5 },
                { type: 'text', text: `-฿${bill.discount.toLocaleString()}`, color: '#ef4444', size: 'sm', flex: 3, align: 'end' }
              ]
            }] : []),
            { type: 'separator', margin: 'lg' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                { type: 'text', text: 'ยอดเรียกเก็บสุทธิ', weight: 'bold', size: 'md', flex: 5 },
                { type: 'text', text: `฿${totalAmount}`, weight: 'bold', size: 'lg', color: '#4f46e5', flex: 3, align: 'end' }
              ]
            },
            ...(bill.remarks && (!bill.discount || bill.discount <= 0) ? [{
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              contents: [
                { type: 'text', text: `📝 หมายเหตุ: ${bill.remarks}`, color: '#ef4444', size: 'xs', wrap: true }
              ]
            }] : [])
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#4f46e5',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดใบแจ้งหนี้',
                uri: billDetailUrl
              }
            },
            {
              type: 'text',
              text: 'กรุณาชำระเงินภายในวันที่ 5 ของเดือน',
              color: '#aaaaaa',
              size: 'xxs',
              align: 'center',
              margin: 'md'
            }
          ]
        }
      }
    };

    await linePush(lineUserId, [flexMessage]);

    res.json({
      success: true,
      message: `ส่งใบแจ้งหนี้ไปยัง LINE ของคุณ ${tenantName} เรียบร้อยแล้ว`
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// @desc    Send bill image notification to tenant's LINE
// @route   POST /api/line/send-bill-image/:billId
// ==============================
exports.sendBillImageNotification = async (req, res, next) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งไฟล์รูปภาพ Base64' });
    }

    const bill = await Bill.findById(req.params.billId)
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName lineUserId');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลบิล' });
    }

    if (!bill.tenant || !bill.tenant.lineUserId) {
      return res.status(400).json({ success: false, message: 'ผู้เช่ารายนี้ยังไม่ได้เชื่อมต่อ LINE' });
    }

    const lineUserId = bill.tenant.lineUserId;
    const tenantName = `${bill.tenant.firstName} ${bill.tenant.lastName}`;
    const roomNumber = bill.room?.roomNumber || '-';

    // Save base64 image to file
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
    const uploadDir = path.join(__dirname, '../../public/uploads/bills');

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `bill-${bill._id}.png`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, base64Data, 'base64');

    // Create public URL pointing to the backend where the image is actually hosted
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const backendUrl = `${protocol}://${req.get('host')}`;
    const imageUrl = `${backendUrl}/uploads/bills/${filename}`;

    // Send Image Message
    const imageMessage = {
      type: 'image',
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl
    };

    await linePush(lineUserId, [imageMessage]);

    res.json({
      success: true,
      message: `ส่งรูปใบเสร็จค่าเช่าไปยัง LINE ของคุณ ${tenantName} เรียบร้อยแล้ว`
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// @desc    Send payment receipt notification to tenant's LINE
// ==============================
exports.sendPaymentNotification = async (billId) => {
  try {
    const bill = await Bill.findById(billId)
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName lineUserId');

    if (!bill) {
      console.error('Payment notification failed: Bill not found');
      return;
    }

    if (!bill.tenant || !bill.tenant.lineUserId) {
      console.log(`Tenant for room ${bill.room?.roomNumber} has not linked LINE. Skipping notification.`);
      return;
    }

    const lineUserId = bill.tenant.lineUserId;
    const tenantName = `${bill.tenant.firstName} ${bill.tenant.lastName}`;
    const roomNumber = bill.room?.roomNumber || '-';
    const billingMonth = bill.billingMonth;
    const [year, month] = billingMonth.split('-');
    const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiMonth = `${thaiMonths[parseInt(month)]} ${parseInt(year) + 543}`;
    const totalAmount = bill.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const billDetailUrl = `${APP_BASE_URL}/share/bill/${bill._id}`;
    
    // Format paid date
    const paidDateStr = bill.paidDate 
      ? new Date(bill.paidDate).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const flexMessage = {
      type: 'flex',
      altText: `🟢 ยืนยันการชำระเงิน ห้อง ${roomNumber} ประจำเดือน ${thaiMonth} เรียบร้อยแล้ว`,
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#10b981',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '🟢 ยืนยันการชำระเงินสำเร็จ',
              color: '#FFFFFF',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: `ได้รับเงินค่าเช่าห้องพักประจำเดือน ${thaiMonth} แล้ว`,
              color: '#D1FAE5',
              size: 'xs',
              margin: 'sm'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ผู้เช่า', color: '#8b8b8b', size: 'sm', flex: 3 },
                { type: 'text', text: tenantName, weight: 'bold', size: 'sm', flex: 5, align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ห้องพัก', color: '#8b8b8b', size: 'sm', flex: 3 },
                { type: 'text', text: `ห้อง ${roomNumber}`, weight: 'bold', size: 'sm', flex: 5, align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'วันเวลาที่ชำระ', color: '#8b8b8b', size: 'sm', flex: 3 },
                { type: 'text', text: paidDateStr + ' น.', weight: 'bold', size: 'sm', flex: 5, align: 'end' }
              ]
            },
            { type: 'separator', margin: 'lg' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                { type: 'text', text: 'ยอดชำระทั้งสิ้น', weight: 'bold', size: 'md', flex: 5 },
                { type: 'text', text: `฿${totalAmount}`, weight: 'bold', size: 'lg', color: '#10b981', flex: 3, align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'สถานะ', color: '#8b8b8b', size: 'sm', flex: 3 },
                { type: 'text', text: 'ชำระเงินเรียบร้อยแล้ว', weight: 'bold', color: '#10b981', size: 'sm', flex: 5, align: 'end' }
              ]
            },
            { type: 'separator', margin: 'lg' },
            {
              type: 'text',
              text: '🙏 หอพักขอขอบพระคุณที่ชำระเงินตรงเวลาค่ะ ✨',
              color: '#059669',
              size: 'sm',
              align: 'center',
              weight: 'bold',
              margin: 'lg',
              wrap: true
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#10b981',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดใบเสร็จรับเงิน',
                uri: billDetailUrl
              }
            }
          ]
        }
      }
    };

    await linePush(lineUserId, [flexMessage]);
    console.log(`Payment confirmation LINE notification sent to ${tenantName}`);
  } catch (error) {
    console.error('Failed to send payment LINE notification:', error);
  }
};

