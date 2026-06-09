import { API_URL } from './constants';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'เกิดข้อผิดพลาดในการเรียกข้อมูล');
    }

    return result;
  } catch (error) {
    console.error(`API Fetch Error: ${url}`, error);
    throw error;
  }
}

export const api = {
  // Rooms
  getRooms: (params) => {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams(params);
      query = `?${searchParams.toString()}`;
    }
    return request(`/rooms${query}`);
  },
  getRoom: (id) => request(`/rooms/${id}`),
  createRoom: (data) => request('/rooms', { method: 'POST', body: data }),
  updateRoom: (id, data) => request(`/rooms/${id}`, { method: 'PUT', body: data }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // Tenants
  getTenants: (params) => {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams(params);
      query = `?${searchParams.toString()}`;
    }
    return request(`/tenants${query}`);
  },
  getTenant: (id) => request(`/tenants/${id}`),
  createTenant: (data) => request('/tenants', { method: 'POST', body: data }),
  updateTenant: (id, data) => request(`/tenants/${id}`, { method: 'PUT', body: data }),
  deleteTenant: (id) => request(`/tenants/${id}`, { method: 'DELETE' }),

  // Bills
  getBills: (params) => {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams(params);
      query = `?${searchParams.toString()}`;
    }
    return request(`/bills${query}`);
  },
  getBill: (id) => request(`/bills/${id}`),
  generateBills: (data) => request('/bills/generate', { method: 'POST', body: data }),
  updateBill: (id, data) => request(`/bills/${id}`, { method: 'PUT', body: data }),
  payBill: (id) => request(`/bills/${id}/pay`, { method: 'PUT' }),
  deleteBill: (id) => request(`/bills/${id}`, { method: 'DELETE' }),

  // Reports
  getSummary: () => request('/reports/summary'),
  getRevenue: (year) => request(`/reports/revenue?year=${year || new Date().getFullYear()}`),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),

  // LINE Integration
  generateLineToken: (tenantId) => request(`/line/generate-token/${tenantId}`, { method: 'POST' }),
  sendBillToLine: (billId) => request(`/line/send-bill/${billId}`, { method: 'POST' }),
};
