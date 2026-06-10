'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  MdSettings, 
  MdBusiness, 
  MdLocationOn, 
  MdPhone, 
  MdWaterDrop, 
  MdFlashOn, 
  MdSave, 
  MdAdd, 
  MdClose, 
  MdPerson, 
  MdMail, 
  MdLock,
  MdEdit,
  MdDelete
} from 'react-icons/md';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'admins'

  // General Settings States
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

  // Admin Accounts States
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true
  });

  // Dialogs States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const triggerConfirm = (message, onConfirm) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  // Load General Settings
  const fetchSettings = async () => {
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
  };

  // Load Admin Accounts
  const fetchAdmins = async () => {
    try {
      setAdminsLoading(true);
      const res = await api.getUsers();
      if (res.success && res.data) {
        setAdmins(res.data);
      }
    } catch (err) {
      console.error('Failed to load admins', err);
      setAdminsError('ไม่สามารถโหลดบัญชีผู้ใช้ระบบได้');
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
  }, [activeTab]);

  // General Settings Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'defaultWaterRate' || name === 'defaultElectricityRate' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateSettings(settings);
      if (res.success) {
        showToast('บันทึกการตั้งค่าสำเร็จ', 'success');
        // Trigger event to sync dynamic dormitoryName in Header & Sidebar
        window.dispatchEvent(new Event('settingsUpdated'));
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Admin Management Handlers
  const handleAdminInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAdminFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOpenAddAdminModal = () => {
    setEditingAdmin(null);
    setAdminFormData({
      name: '',
      email: '',
      password: '',
      isActive: true
    });
    setIsAdminModalOpen(true);
  };

  const handleOpenEditAdminModal = (admin) => {
    setEditingAdmin(admin);
    setAdminFormData({
      name: admin.name,
      email: admin.email,
      password: '', // blank by default when editing
      isActive: admin.isActive
    });
    setIsAdminModalOpen(true);
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingAdmin) {
        // filter password if blank during editing
        const updateData = { ...adminFormData };
        if (updateData.password.trim() === '') {
          delete updateData.password;
        }
        res = await api.updateUser(editingAdmin._id, updateData);
      } else {
        if (adminFormData.password.trim() === '') {
          showToast('กรุณาระบุรหัสผ่านสำหรับแอดมินใหม่', 'warning');
          return;
        }
        res = await api.createUser(adminFormData);
      }

      if (res.success) {
        showToast(editingAdmin ? 'แก้ไขข้อมูลแอดมินสำเร็จ' : 'เพิ่มแอดมินใหม่สำเร็จ', 'success');
        setIsAdminModalOpen(false);
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const handleDeleteAdmin = (id, name) => {
    triggerConfirm(
      `คุณต้องการลบสิทธิ์แอดมินของคุณ ${name} หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้`,
      async () => {
        try {
          const res = await api.deleteUser(id);
          if (res.success) {
            showToast('ลบสิทธิ์แอดมินสำเร็จ', 'success');
            fetchAdmins();
          }
        } catch (err) {
          showToast(err.message || 'เกิดข้อผิดพลาดในการลบสิทธิ์แอดมิน', 'error');
        }
      }
    );
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
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>ตั้งค่าระบบ</h2>
          <p style={{ color: 'var(--text-secondary)' }}>ตั้งค่าข้อมูลหอพัก อัตราค่าบริการ และจัดการบัญชีสิทธิ์การเข้าใช้งานระบบ</p>
        </div>
      </div>

      {/* Glassmorphic Tabs Navigation */}
      <div className="glass-card" style={{ display: 'flex', gap: '12px', padding: '12px 20px', marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('general')}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          ตั้งค่าทั่วไป
        </button>
        <button 
          className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('admins')}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          จัดการบัญชีแอดมิน
        </button>
      </div>

      {/* Tab Contents: General Settings */}
      {activeTab === 'general' && (
        error ? (
          <div className="glass-card" style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
        ) : (
          <form onSubmit={handleSubmitSettings}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Dormitory Info */}
              <div>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                  <MdBusiness size={20} /> ข้อมูลหอพัก
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
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

                  <div className="form-group" style={{ marginBottom: 0 }}>
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
        )
      )}

      {/* Tab Contents: Admin Management */}
      {activeTab === 'admins' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
                <MdPerson size={22} /> รายชื่อบัญชีผู้ดูแลระบบ (Admins)
              </h3>
              <button className="btn btn-primary" onClick={handleOpenAddAdminModal} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <MdAdd size={18} /> เพิ่มบัญชีแอดมิน
              </button>
            </div>

            {adminsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>กำลังโหลดรายชื่อแอดมิน...</div>
            ) : adminsError ? (
              <div style={{ color: 'var(--color-danger)' }}>{adminsError}</div>
            ) : (
              <>
                {/* Table layout for desktop */}
                <div className="custom-table-container desktop-only">
                  <table className="custom-table" style={{ minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%', whiteSpace: 'nowrap' }}>ชื่อแอดมิน</th>
                        <th style={{ width: '35%', whiteSpace: 'nowrap' }}>อีเมล</th>
                        <th style={{ width: '20%', whiteSpace: 'nowrap' }}>สถานะ</th>
                        <th style={{ width: '20%', whiteSpace: 'nowrap' }}>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.length > 0 ? (
                        admins.map((admin) => (
                          <tr key={admin._id}>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{admin.name}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{admin.email}</td>
                            <td>
                              <span className={`badge ${admin.isActive ? 'badge-success' : 'badge-danger'}`}>
                                {admin.isActive ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleOpenEditAdminModal(admin)}
                                >
                                  <MdEdit size={14} /> แก้ไข
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                                >
                                  <MdDelete size={14} /> ลบ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            ไม่พบบัญชีผู้ดูแลระบบในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Card layout for mobile/narrow screens */}
                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {admins.length > 0 ? (
                    admins.map((admin) => (
                      <div key={admin._id} className="mobile-card" style={{ padding: '16px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--accent-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'white',
                            fontSize: '1rem',
                            boxShadow: '0 0 8px rgba(99, 102, 241, 0.25)'
                          }}>
                            {admin.name.charAt(0)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {admin.name}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {admin.email}
                            </span>
                          </div>
                          <span className={`badge ${admin.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {admin.isActive ? 'ใช้งาน' : 'ระงับ'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => handleOpenEditAdminModal(admin)}
                          >
                            <MdEdit size={14} /> แก้ไข
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                          >
                            <MdDelete size={14} /> ลบ
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                      ไม่พบบัญชีผู้ดูแลระบบในระบบ
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      {/* Modal: Add/Edit Admin Account */}
      {isAdminModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>
                {editingAdmin ? `แก้ไขบัญชีผู้ใช้: ${editingAdmin.name}` : 'เพิ่มบัญชีผู้ดูแลระบบใหม่'}
              </h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} 
                onClick={() => setIsAdminModalOpen(false)}
              >
                <MdClose size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAdminSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">ชื่อผู้แสดงตัวตน *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <MdPerson size={18} />
                    </span>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="name" 
                      value={adminFormData.name}
                      onChange={handleAdminInputChange}
                      placeholder="เช่น เจษฎา มาตเรียง" 
                      required
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">อีเมลเข้าสู่ระบบ *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <MdMail size={18} />
                    </span>
                    <input 
                      type="email" 
                      className="form-input" 
                      name="email" 
                      value={adminFormData.email}
                      onChange={handleAdminInputChange}
                      placeholder="เช่น jed667788@gmail.com" 
                      required
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    รหัสผ่าน {editingAdmin ? '' : '*'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <MdLock size={18} />
                    </span>
                    <input 
                      type="password" 
                      className="form-input" 
                      name="password" 
                      value={adminFormData.password}
                      onChange={handleAdminInputChange}
                      placeholder={editingAdmin ? 'เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน' : 'ระบุรหัสผ่านความยาวอย่างน้อย 6 ตัวอักษร'} 
                      required={!editingAdmin}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      name="isActive" 
                      checked={adminFormData.isActive}
                      onChange={handleAdminInputChange}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>เปิดใช้งานบัญชีนี้ (Active)</span>
                  </label>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdminModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกบัญชี</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}

      {/* Custom Confirm Dialog */}
      {confirmState.show && (
        <ConfirmModal 
          message={confirmState.message} 
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(prev => ({ ...prev, show: false }));
          }}
          onCancel={() => setConfirmState(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}
