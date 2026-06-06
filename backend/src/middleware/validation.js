/**
 * Request Validation Middleware
 */

// Validate room creation/update
exports.validateRoom = (req, res, next) => {
  const { roomNumber, floor, monthlyRent } = req.body;

  if (req.method === 'POST') {
    if (!roomNumber) return res.status(400).json({ success: false, message: 'กรุณาระบุเลขห้อง' });
    if (!floor) return res.status(400).json({ success: false, message: 'กรุณาระบุชั้น' });
    if (monthlyRent === undefined) return res.status(400).json({ success: false, message: 'กรุณาระบุค่าเช่ารายเดือน' });
  }

  if (monthlyRent !== undefined && monthlyRent < 0) {
    return res.status(400).json({ success: false, message: 'ค่าเช่าต้องไม่ต่ำกว่า 0' });
  }

  next();
};

// Validate tenant creation/update
exports.validateTenant = (req, res, next) => {
  const { firstName, lastName, phone } = req.body;

  if (req.method === 'POST') {
    if (!firstName) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ' });
    if (!lastName) return res.status(400).json({ success: false, message: 'กรุณาระบุนามสกุล' });
    if (!phone) return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทรศัพท์' });
  }

  next();
};

// Validate bill generation
exports.validateBillGeneration = (req, res, next) => {
  const { billingMonth } = req.body;

  if (billingMonth && !/^\d{4}-\d{2}$/.test(billingMonth)) {
    return res.status(400).json({ success: false, message: 'รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)' });
  }

  next();
};
