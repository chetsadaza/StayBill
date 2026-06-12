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

// Parse date/time from SlipOK response into a valid JavaScript Date
exports.parseSlipDate = (slipData) => {
  if (!slipData) return null;
  
  // 1. Try transTimestamp first as it's the recommended ISO 8601 field
  if (slipData.transTimestamp) {
    const d = new Date(slipData.transTimestamp);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 2. Try parsing transDate (yyyyMMdd) and transTime (HH:mm:ss)
  if (slipData.transDate && typeof slipData.transDate === 'string' && slipData.transDate.length === 8) {
    const y = slipData.transDate.substring(0, 4);
    const m = slipData.transDate.substring(4, 6);
    const d = slipData.transDate.substring(6, 8);
    const time = slipData.transTime || '00:00:00';
    const dateStr = `${y}-${m}-${d}T${time}`;
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }

  return null;
};

// Check if an actual (possibly masked) account number matches the expected account number
// Supports wildcard/mask characters: x, X, *, _, •
// Requires at least 3 real (unmasked) digit positions to overlap and match for security
exports.matchMaskedAccount = (actual, expected) => {
  if (!actual || !expected) return false;

  // Remove only formatting chars (dashes, spaces) but KEEP mask chars like *, x, _, •
  const cleanActual = actual.replace(/[-\s.]/g, '');
  const cleanExpected = expected.replace(/[-\s.]/g, '');

  // If they match exactly (case-insensitive)
  if (cleanActual.toLowerCase() === cleanExpected.toLowerCase()) return true;

  // If lengths are different, they cannot match under positional masking
  if (cleanActual.length !== cleanExpected.length) return false;

  const wildcardChars = new Set(['x', 'X', '*', '_', '•', '●']);
  let matchedDigits = 0; // count of real digit positions that matched

  // Compare position by position
  for (let i = 0; i < cleanActual.length; i++) {
    const actChar = cleanActual[i];
    const expChar = cleanExpected[i];

    const isActWildcard = wildcardChars.has(actChar);
    const isExpWildcard = wildcardChars.has(expChar);

    if (isActWildcard && isExpWildcard) {
      // Both masked — skip, no information
      continue;
    }

    if (isActWildcard || isExpWildcard) {
      // One side is masked — skip, cannot compare
      continue;
    }

    // Both sides have real characters — must match
    if (actChar !== expChar) {
      return false;
    }

    matchedDigits++;
  }

  // Require at least 3 real digit positions to overlap for security
  // This prevents false positives when both sides mask different positions
  return matchedDigits >= 3;
};



