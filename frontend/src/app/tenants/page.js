'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MdAdd, MdEdit, MdDelete, MdClose, MdExitToApp, MdPhone, MdAssignmentInd } from 'react-icons/md';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    idCard: '',
    room: '', // Room ObjectId
    moveInDate: new Date().toISOString().substring(0, 10),
    isActive: true
  });

  // Filter state
  const [activeFilter, setActiveFilter] = useState('true'); // 'true' = active, 'false' = historic, '' = all

  // Custom alert states
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const triggerConfirm = (message, onConfirm) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.getTenants(activeFilter ? { isActive: activeFilter } : null);
      if (res.success) {
        setTenants(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลผู้เช่าได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      const res = await api.getRooms({ status: 'available' });
      if (res.success) {
        setAvailableRooms(res.data);
      }
    } catch (err) {
      console.error('Error fetching available rooms', err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [activeFilter]);

  useEffect(() => {
    if (isModalOpen) {
      fetchAvailableRooms();
    }
  }, [isModalOpen]);

  const handleOpenAddModal = () => {
    setEditingTenant(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      idCard: '',
      room: '',
      moveInDate: new Date().toISOString().substring(0, 10),
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      phone: tenant.phone,
      idCard: tenant.idCard || '',
      room: tenant.room?._id || '',
      moveInDate: tenant.moveInDate ? tenant.moveInDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      isActive: tenant.isActive
    });
    setIsModalOpen(true);
  };

  const handleDeleteTenant = (id, name) => {
    triggerConfirm(
      `คุณต้องการลบข้อมูลผู้เช่าคุณ ${name} ออกจากฐานข้อมูลหรือไม่?\nการลบนี้ไม่สามารถย้อนกลับได้`,
      async () => {
        try {
          const res = await api.deleteTenant(id);
          if (res.success) {
            showToast('ลบข้อมูลผู้เช่าสำเร็จ', 'success');
            fetchTenants();
          }
        } catch (err) {
          showToast(err.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        }
      }
    );
  };

  const handleCheckoutTenant = (id, name) => {
    triggerConfirm(
      `คุณต้องการทำรายการ "ย้ายออก" สำหรับคุณ ${name} ใช่หรือไม่?\nห้องพักจะถูกคืนสถานะเป็นว่าง และสัญญาจะสิ้นสุดลง`,
      async () => {
        try {
          const res = await api.updateTenant(id, { isActive: false });
          if (res.success) {
            showToast('ทำรายการย้ายออกสำเร็จ', 'success');
            fetchTenants();
          }
        } catch (err) {
          showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกย้ายออก', 'error');
        }
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      const normalizedData = {
        ...formData,
        room: formData.room === '' ? null : formData.room
      };
      
      if (editingTenant) {
        res = await api.updateTenant(editingTenant._id, normalizedData);
      } else {
        res = await api.createTenant(normalizedData);
      }

      if (res.success) {
        showToast(editingTenant ? 'แก้ไขข้อมูลผู้เช่าสำเร็จ' : 'เพิ่มผู้เช่าใหม่สำเร็จ', 'success');
        setIsModalOpen(false);
        fetchTenants();
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  return (
    <>
      {/* Header section */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>จัดการผู้เช่า</h2>
          <p style={{ color: 'var(--text-secondary)' }}>ลงทะเบียนผู้เช่าใหม่ แก้ไขข้อมูลสัญญา และทำรายการย้ายออก</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <MdAdd size={20} /> เพิ่มผู้เช่าใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card filter-bar">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>สถานะสัญญาเช่า:</span>
        <div className="filter-options">
          {[
            { label: 'ผู้เช่าปัจจุบัน', value: 'true' },
            { label: 'ผู้เช่าในอดีต (ย้ายออกแล้ว)', value: 'false' },
            { label: 'ทั้งหมด', value: '' }
          ].map((filter) => (
            <button
              key={filter.value}
              className={`btn ${activeFilter === filter.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดข้อมูลผู้เช่า...</div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
      ) : tenants.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          ไม่พบข้อมูลผู้เช่าในระบบ
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="glass-card desktop-only" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ชื่อ - นามสกุล</th>
                    <th>เบอร์โทรศัพท์</th>
                    <th>เลขบัตรประชาชน</th>
                    <th>ห้องพัก</th>
                    <th>วันที่ย้ายเข้า</th>
                    <th>สถานะสัญญา</th>
                    <th>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const name = `${tenant.firstName} ${tenant.lastName}`;
                    return (
                      <tr key={tenant._id}>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdPhone size={14} style={{ color: 'var(--text-muted)' }} />
                            {tenant.phone}
                          </span>
                        </td>
                        <td>{tenant.idCard || '-'}</td>
                        <td>
                          {tenant.room ? (
                            <span style={{ 
                              background: 'rgba(99,102,241,0.15)', 
                              color: 'var(--accent-primary)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontWeight: 600
                            }}>
                              ห้อง {tenant.room.roomNumber}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>ไม่ได้เข้าพัก</span>
                          )}
                        </td>
                        <td>{formatDate(tenant.moveInDate)}</td>
                        <td>
                          {tenant.isActive ? (
                            <span className="badge badge-success">ปกติ (กำลังเช่า)</span>
                          ) : (
                            <span className="badge badge-danger">ย้ายออกแล้ว</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleOpenEditModal(tenant)}
                            >
                              <MdEdit size={14} /> แก้ไข
                            </button>
                            
                            {tenant.isActive && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '0.8rem',
                                  color: 'var(--color-warning)',
                                  borderColor: 'rgba(245, 158, 11, 0.2)' 
                                }}
                                onClick={() => handleCheckoutTenant(tenant._id, name)}
                              >
                                <MdExitToApp size={14} /> แจ้งย้ายออก
                              </button>
                            )}

                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '6px' }}
                              onClick={() => handleDeleteTenant(tenant._id, name)}
                            >
                              <MdDelete size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-only" style={{ gap: '16px' }}>
            {tenants.map((tenant) => {
              const name = `${tenant.firstName} ${tenant.lastName}`;
              return (
                <div key={tenant._id} className="mobile-card" style={{ position: 'relative', overflow: 'hidden' }}>
                  <img 
                    src="/images/7.png" 
                    alt="Panda corner watermark" 
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'bottom left',
                      pointerEvents: 'none',
                      zIndex: 0,
                      opacity: 0.65
                    }}
                  />
                  <div className="mobile-card-header" style={{ position: 'relative', zIndex: 1 }}>
                    <span className="mobile-card-title">{name}</span>
                    {tenant.isActive ? (
                      <span className="badge badge-success">กำลังเช่า</span>
                    ) : (
                      <span className="badge badge-danger">ย้ายออกแล้ว</span>
                    )}
                  </div>
                  <div className="mobile-card-body" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">ห้องพัก:</span>
                      <span className="mobile-card-value">
                        {tenant.room ? (
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>ห้อง {tenant.room.roomNumber}</span>
                        ) : (
                          'ไม่ได้เข้าพัก'
                        )}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">เบอร์โทร:</span>
                      <span className="mobile-card-value">{tenant.phone}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">เลขบัตร ปชช.:</span>
                      <span className="mobile-card-value">{tenant.idCard || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">วันที่ย้ายเข้า:</span>
                      <span className="mobile-card-value">{formatDate(tenant.moveInDate)}</span>
                    </div>
                  </div>
                  <div className="mobile-card-actions" style={{ position: 'relative', zIndex: 1 }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleOpenEditModal(tenant)}
                    >
                      <MdEdit size={14} /> แก้ไข
                    </button>
                    
                    {tenant.isActive && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ color: 'var(--color-warning)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                        onClick={() => handleCheckoutTenant(tenant._id, name)}
                      >
                        <MdExitToApp size={14} /> ย้ายออก
                      </button>
                    )}

                    <button 
                      className="btn btn-danger" 
                      style={{ flex: '0 0 42px', padding: '8px' }}
                      onClick={() => handleDeleteTenant(tenant._id, name)}
                    >
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>{editingTenant ? 'แก้ไขข้อมูลผู้เช่า' : 'ลงทะเบียนผู้เช่าใหม่'}</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">ชื่อจริง *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="firstName" 
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="สมชาย" 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">นามสกุล *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="lastName" 
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="ใจดี" 
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรศัพท์ *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="phone" 
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="เช่น 0891234567" 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เลขประจำตัวประชาชน</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="idCard" 
                      value={formData.idCard}
                      onChange={handleInputChange}
                      placeholder="13 หลัก"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">เลือกห้องที่จะเข้าพัก</label>
                    <select 
                      className="form-input" 
                      name="room" 
                      value={formData.room}
                      onChange={handleInputChange}
                      disabled={editingTenant && !formData.isActive} // disable if historic tenant
                    >
                      <option value="">-- ไม่ระบุห้อง / พักภายนอก --</option>
                      {/* Show current tenant room first in list when editing */}
                      {editingTenant && editingTenant.room && (
                        <option value={editingTenant.room._id}>
                          ห้อง {editingTenant.room.roomNumber} (ห้องเดิมที่เข้าพัก)
                        </option>
                      )}
                      {availableRooms.map((room) => (
                        <option key={room._id} value={room._id}>
                          ห้อง {room.roomNumber} (ว่าง - {room.floor}F)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันที่ย้ายเข้าสัญญาเช่า</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      name="moveInDate" 
                      value={formData.moveInDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {editingTenant && (
                  <div className="form-group">
                    <label className="form-label">สถานะสัญญา</label>
                    <select 
                      className="form-input" 
                      name="isActive" 
                      value={formData.isActive}
                      onChange={(e) => {
                        const active = e.target.value === 'true';
                        setFormData(prev => ({
                          ...prev,
                          isActive: active,
                          room: active ? prev.room : '' // clear room if user manually selects inactive
                        }));
                      }}
                    >
                      <option value="true">เช่าปกติ</option>
                      <option value="false">สิ้นสุดการเช่า (ย้ายออก)</option>
                    </select>
                  </div>
                )}

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกข้อมูล</button>
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
    </>
  );
}
