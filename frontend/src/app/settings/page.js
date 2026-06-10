'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MdSettings, MdBusiness, MdLocationOn, MdPhone, MdWaterDrop, MdFlashOn, MdSave } from 'react-icons/md';
import Toast from '@/components/ui/Toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    dormitoryName: '',
    address: '',
    phone: '',
    defaultWaterRate: 18,
    defaultElectricityRate: 8
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await api.getSettings();
        if (res.success && res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
        setError('ไม่สามารถโหลดข้อมูลตั้งค่าได้');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'defaultWaterRate' || name === 'defaultElectricityRate' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateSettings(settings);
      if (res.success) {
        showToast('บันทึกการตั้งค่าสำเร็จ', 'success');
        // Trigger a custom event so other components (e.g. Layout/Header) can update the dormitory name
        window.dispatchEvent(new Event('settingsUpdated'));
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูลการตั้งค่า...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>ตั้งค่าระบบ</h2>
          <p style={{ color: 'var(--text-secondary)' }}>ตั้งค่าข้อมูลหอพักและระบุอัตราค่าน้ำ/ค่าไฟเริ่มต้นของบิล</p>
        </div>
      </div>

      {error ? (
        <div className="glass-card" style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Dormitory Info */}
            <div>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                <MdBusiness size={20} /> ข้อมูลหอพัก
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">ชื่อหอพัก *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="dormitoryName" 
                    value={settings.dormitoryName}
                    onChange={handleInputChange}
                    placeholder="เช่น หอพักแสนสุข" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ที่อยู่หอพัก</label>
                  <textarea 
                    className="form-input" 
                    name="address" 
                    value={settings.address}
                    onChange={handleInputChange}
                    placeholder="เช่น 123/45 ถนนราชดำเนิน แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพฯ"
                    rows="3"
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์ติดต่อ</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <MdPhone size={18} />
                    </span>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="phone" 
                      value={settings.phone}
                      onChange={handleInputChange}
                      placeholder="เช่น 081-234-5678"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0' }} />

            {/* Default Rates */}
            <div>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                <MdSettings size={20} /> อัตราค่าสาธารณูปโภคเริ่มต้น (สำหรับสร้างห้องพักใหม่)
              </h3>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">ค่าน้ำเริ่มต้น (บาท/หน่วย) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6' }}>
                      <MdWaterDrop size={18} />
                    </span>
                    <input 
                      type="number" 
                      className="form-input" 
                      name="defaultWaterRate" 
                      value={settings.defaultWaterRate}
                      onChange={handleInputChange}
                      min="0"
                      required
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ค่าไฟเริ่มต้น (บาท/หน่วย) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#eab308' }}>
                      <MdFlashOn size={18} />
                    </span>
                    <input 
                      type="number" 
                      className="form-input" 
                      name="defaultElectricityRate" 
                      value={settings.defaultElectricityRate}
                      onChange={handleInputChange}
                      min="0"
                      required
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <MdSave size={20} />
                {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            </div>

          </div>
        </form>
      )}

      {/* Custom Toast Alert */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}
    </>
  );
}
