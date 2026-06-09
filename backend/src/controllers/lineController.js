const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Tenant = require('../models/Tenant');
const Bill = require('../models/Bill');

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
                { type: 'text', text: 'ส่วนลด', color: '#ef4444', size: 'sm', flex: 5 },
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
            ...(bill.remarks ? [{
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

