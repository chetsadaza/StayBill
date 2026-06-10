export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const WATER_TYPES = {
  unit: 'คิดตามหน่วย',
  flat: 'เหมาจ่าย',
  free: 'ฟรี / ไม่เรียกเก็บ'
};

export const ELECTRICITY_TYPES = {
  unit: 'คิดตามหน่วย',
  flat: 'เหมาจ่าย',
  free: 'ฟรี / ไม่เรียกเก็บ'
};

export const ROOM_TYPES = {
  single: 'ห้องเดี่ยว (Standard)',
  double: 'ห้องคู่ (Superior)',
  suite: 'ห้องชุด (Suite)'
};

export const ROOM_STATUS = {
  available: 'ว่าง',
  occupied: 'มีผู้เช่า',
  maintenance: 'ซ่อมบำรุง'
};

export const BILL_STATUS = {
  pending: 'ค้างชำระ',
  paid: 'ชำระแล้ว',
  overdue: 'เกินกำหนดชำระ'
};
