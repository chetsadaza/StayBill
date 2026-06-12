/**
 * Helper Utilities
 */

// Format month string: "2026-06"
exports.getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Format currency
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
};

// Get month name in Thai
exports.getThaiMonth = (monthStr) => {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const [year, month] = monthStr.split('-');
  return `${months[parseInt(month) - 1]} ${parseInt(year) + 543}`;
};

// Verify bank transfer slip via SlipOK API
exports.verifySlipWithSlipOk = async (imageBuffer) => {
  const branchId = process.env.SLIPOK_BRANCH_ID;
  const apiKey = process.env.SLIPOK_API_KEY;

  if (!branchId || !apiKey) {
    throw new Error('ระบบตรวจสอบสลิปไม่ได้ระบุ SLIPOK_API_KEY หรือ SLIPOK_BRANCH_ID');
  }

  const formData = new FormData();
  formData.append('files', new Blob([imageBuffer], { type: 'image/jpeg' }), 'slip.jpg');
  formData.append('log', 'true');

  const res = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
    method: 'POST',
    headers: {
      'x-authorization': apiKey
    },
    body: formData
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errJson = await res.json();
        return {
          success: false,
          code: errJson.code,
          message: errJson.message || 'ข้อมูลสลิปไม่ถูกต้อง',
          data: errJson.data
        };
      } catch (e) {
        // fallback to text error if JSON parsing fails
      }
    }
    const errText = await res.text();
    console.error('SlipOK API failed response:', errText);
    throw new Error(`ไม่สามารถเชื่อมต่อบริการตรวจสอบสลิปได้ (HTTP ${res.status}): ${errText}`);
  }

  return res.json();
};

