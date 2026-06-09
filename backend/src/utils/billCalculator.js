/**
 * Bill Calculator Utility
 * คำนวณค่าน้ำ ค่าไฟ ตามประเภท (unit/flat/free)
 */

/**
 * คำนวณค่าน้ำ
 * @param {string} type - "unit" | "flat" | "free"
 * @param {number} rate - อัตราค่าน้ำ
 * @param {number} previousMeter - เลขมิเตอร์เดือนก่อน
 * @param {number} currentMeter - เลขมิเตอร์ปัจจุบัน
 * @returns {object} { units, total }
 */
exports.calculateWater = (type, rate, previousMeter = 0, currentMeter = 0) => {
  switch (type) {
    case 'unit':
      const units = Math.max(0, currentMeter - previousMeter);
      return { units, total: units * rate };
    case 'flat':
      return { units: 0, total: rate };
    case 'free':
      return { units: 0, total: 0 };
    default:
      return { units: 0, total: 0 };
  }
};

/**
 * คำนวณค่าไฟ
 * @param {string} type - "unit" | "flat" | "free"
 * @param {number} rate - อัตราค่าไฟ
 * @param {number} previousMeter - เลขมิเตอร์เดือนก่อน
 * @param {number} currentMeter - เลขมิเตอร์ปัจจุบัน
 * @returns {object} { units, total }
 */
exports.calculateElectricity = (type, rate, previousMeter = 0, currentMeter = 0) => {
  switch (type) {
    case 'unit':
      const units = Math.max(0, currentMeter - previousMeter);
      return { units, total: units * rate };
    case 'flat':
      return { units: 0, total: rate };
    case 'free':
      return { units: 0, total: 0 };
    default:
      return { units: 0, total: 0 };
  }
};

/**
 * คำนวณยอดรวมบิล
 * @param {number} rent - ค่าเช่า
 * @param {number} waterTotal - ค่าน้ำรวม
 * @param {number} electricityTotal - ค่าไฟรวม
 * @param {Array} additionalCharges - ค่าใช้จ่ายเพิ่มเติม [{description, amount}]
 * @returns {number} totalAmount
 */
exports.calculateTotal = (rent, waterTotal, electricityTotal, additionalCharges = [], discount = 0) => {
  const additionalTotal = additionalCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  return Math.max(0, rent + waterTotal + electricityTotal + additionalTotal - discount);
};
