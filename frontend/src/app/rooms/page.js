'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTHB } from '@/lib/utils';
import { WATER_TYPES, ELECTRICITY_TYPES, ROOM_TYPES, ROOM_STATUS } from '@/lib/constants';
import { MdAdd, MdEdit, MdDelete, MdClose, MdInfo } from 'react-icons/md';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    floor: 1,
    type: 'single',
    monthlyRent: 4000,
    waterType: 'unit',
    waterRate: 18,
    electricityType: 'unit',
    electricityRate: 8,
    status: 'available'
  });
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState('');

  // Custom alert states
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const triggerConfirm = (message, onConfirm) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  // Load Rooms
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.getRooms(statusFilter ? { status: statusFilter } : null);
      if (res.success) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลห้องพักได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [statusFilter]);

  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isModalOpen]);

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      floor: 1,
      type: 'single',
      monthlyRent: 4000,
      waterType: 'unit',
      waterRate: 18,
      electricityType: 'unit',
      electricityRate: 8,
      status: 'available'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      floor: room.floor,
      type: room.type,
      monthlyRent: room.monthlyRent,
      waterType: room.waterType,
      waterRate: room.waterRate,
      electricityType: room.electricityType,
      electricityRate: room.electricityRate,
      status: room.status
    });
    setIsModalOpen(true);
  };

  const handleDeleteRoom = (id, roomNumber) => {
    triggerConfirm(
      `คุณต้องการลบห้องพักหมายเลข ${roomNumber} หรือไม่?\nการลบนี้จะยกเลิกสัญญาเช่าหากมีผู้เช่าปัจจุบันอยู่`,
      async () => {
        try {
          const res = await api.deleteRoom(id);
          if (res.success) {
            showToast('ลบห้องพักสำเร็จ', 'success');
            fetchRooms();
          }
        } catch (err) {
          showToast(err.message || 'ลบห้องพักไม่สำเร็จ', 'error');
        }
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'floor' || name === 'monthlyRent' || name === 'waterRate' || name === 'electricityRate' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingRoom) {
        res = await api.updateRoom(editingRoom._id, formData);
      } else {
        res = await api.createRoom(formData);
      }

      if (res.success) {
        showToast(editingRoom ? 'แก้ไขข้อมูลห้องพักสำเร็จ' : 'เพิ่มห้องพักสำเร็จ', 'success');
        setIsModalOpen(false);
        fetchRooms();
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
          <h2 className="page-title">จัดการห้องพัก</h2>
          <p className="page-subtitle">เพิ่ม แก้ไขข้อมูลห้องพัก และระบุอัตราค่าน้ำ/ค่าไฟรายห้อง</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <MdAdd size={20} /> เพิ่มห้องพัก
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card filter-bar">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>สถานะห้อง:</span>
        <div className="filter-options">
          {[
            { label: 'ทั้งหมด', value: '', img: '/images/3.png', pandaClass: 'filter-bar-panda' },
            { label: 'ว่าง', value: 'available', img: '/images/4.png', pandaClass: 'filter-bar-panda-available' },
            { label: 'มีผู้เช่า', value: 'occupied', img: '/images/5.png', pandaClass: 'filter-bar-panda-occupied' },
            { label: 'ซ่อมบำรุง', value: 'maintenance', img: '/images/6.png', pandaClass: 'filter-bar-panda-maintenance' }
          ].map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  padding: '6px 16px', 
                  fontSize: '0.85rem',
                  position: 'relative',
                  overflow: 'visible'
                }}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
                {isActive && filter.img && (
                  <img 
                    src={filter.img} 
                    alt="Panda filter mascot" 
                    className={filter.pandaClass} 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rooms display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดข้อมูลห้องพัก...</div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
      ) : rooms.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          ไม่พบข้อมูลห้องพักในระบบ
        </div>
      ) : (
        <div className="grid-cols-4">
          {rooms.map((room) => {
            const isOccupied = room.status === 'occupied';
            const isMaint = room.status === 'maintenance';
            
            return (
              <div 
                key={room._id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  borderLeft: `4px solid ${isOccupied ? '#6366f1' : isMaint ? '#ef4444' : '#10b981'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>ห้อง {room.roomNumber}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ชั้น {room.floor} • {ROOM_TYPES[room.type]}</span>
                  </div>
                  <span className={`badge ${isOccupied ? 'badge-info' : isMaint ? 'badge-danger' : 'badge-success'}`}>
                    {ROOM_STATUS[room.status]}
                  </span>
                </div>

                <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ค่าเช่า:</span>
                    <span style={{ fontWeight: 600 }}>{formatTHB(room.monthlyRent)}/เดือน</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ค่าน้ำ:</span>
                    <span>
                      {room.waterType === 'unit' ? `${room.waterRate} บ./หน่วย` : WATER_TYPES[room.waterType]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ค่าไฟ:</span>
                    <span>
                      {room.electricityType === 'unit' ? `${room.electricityRate} บ./หน่วย` : ELECTRICITY_TYPES[room.electricityType]}
                    </span>
                  </div>
                </div>

                {isOccupied && room.tenant && (
                  <div style={{ 
                    background: 'rgba(99,102,241,0.06)', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.8rem',
                    border: '1px dashed rgba(99,102,241,0.2)' 
                  }}>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>ผู้เช่าปัจจุบัน:</div>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{room.tenant.firstName} {room.tenant.lastName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>โทร: {room.tenant.phone}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                    onClick={() => handleOpenEditModal(room)}
                  >
                    <MdEdit size={16} /> แก้ไข
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '8px' }}
                    onClick={() => handleDeleteRoom(room._id, room.roomNumber)}
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingRoom ? `แก้ไขข้อมูลห้อง ${formData.roomNumber}` : 'เพิ่มห้องพักใหม่'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)} aria-label="ปิด">
                <MdClose size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-body modal-body-form">
                
                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">เลขห้อง *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="roomNumber" 
                      value={formData.roomNumber}
                      onChange={handleInputChange}
                      placeholder="เช่น 101" 
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ชั้น *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      name="floor" 
                      value={formData.floor}
                      onChange={handleInputChange}
                      min="1" 
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ประเภทห้องพัก</label>
                    <select 
                      className="form-input" 
                      name="type" 
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      {Object.entries(ROOM_TYPES).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ค่าเช่ารายเดือน (บาท) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      name="monthlyRent" 
                      value={formData.monthlyRent}
                      onChange={handleInputChange}
                      min="0" 
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">สถานะห้องพัก</label>
                  <CustomSelect
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    options={[
                      { 
                        value: 'available', 
                        label: 'ว่าง', 
                        icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> 
                      },
                      { 
                        value: 'maintenance', 
                        label: 'ซ่อมบำรุง', 
                        icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> 
                      },
                      ...(editingRoom?.status === 'occupied' ? [{ 
                        value: 'occupied', 
                        label: 'มีผู้เช่า (จัดการผ่านเมนูผู้เช่า)', 
                        icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} /> 
                      }] : [])
                    ]}
                    disabled={editingRoom?.status === 'occupied'}
                  />
                  {editingRoom?.status === 'occupied' && (
                    <span className="form-hint">* ห้องนี้กำลังมีผู้เช่าอยู่ ไม่สามารถเปลี่ยนสถานะตรงๆ ได้</span>
                  )}
                </div>

                <fieldset className="form-section">
                  <legend>ตั้งค่าการคำนวณค่าน้ำ</legend>
                  
                  <div className="form-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">ประเภทค่าน้ำ</label>
                      <select 
                        className="form-input" 
                        name="waterType" 
                        value={formData.waterType}
                        onChange={handleInputChange}
                      >
                        {Object.entries(WATER_TYPES).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.waterType !== 'free' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          {formData.waterType === 'unit' ? 'อัตราต่อหน่วย (บาท)' : 'ค่าบริการเหมาจ่าย (บาท)'}
                        </label>
                        <input 
                          type="number" 
                          className="form-input" 
                          name="waterRate" 
                          value={formData.waterRate}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend>ตั้งค่าการคำนวณค่าไฟ</legend>
                  
                  <div className="form-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">ประเภทค่าไฟ</label>
                      <select 
                        className="form-input" 
                        name="electricityType" 
                        value={formData.electricityType}
                        onChange={handleInputChange}
                      >
                        {Object.entries(ELECTRICITY_TYPES).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.electricityType !== 'free' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          {formData.electricityType === 'unit' ? 'อัตราต่อหน่วย (บาท)' : 'ค่าบริการเหมาจ่าย (บาท)'}
                        </label>
                        <input 
                          type="number" 
                          className="form-input" 
                          name="electricityRate" 
                          value={formData.electricityRate}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>

                {/* Illustration Area with Panda, Sun/Moon, Mountains, Birds, and Clouds */}
                <div className="room-illustration-container">
                  {/* Sun (light) / Moon (dark) */}
                  <div className="illustration-sun" />
                  <div className="illustration-moon" />
                  {/* Twinkling Stars for Dark Mode */}
                  <div className="star star-1" />
                  <div className="star star-2" />
                  <div className="star star-3" />
                  <div className="star star-4" />
                  <div className="star star-5" />
                  <div className="star star-6" />
                  <div className="star star-7" />
                  <div className="star star-8" />
                  <div className="star star-9" />
                  <div className="star star-10" />
                  {/* Mountains */}
                  <div className="mountain mountain-back" />
                  <div className="mountain mountain-front" />
                  {/* Clouds */}
                  <div className="illustration-cloud cloud-1" />
                  <div className="illustration-cloud cloud-2" />
                  {/* Flying Birds */}
                  <div className="bird bird-1" />
                  <div className="bird bird-2" />
                  <div className="bird bird-3" />
                  {/* Panda */}
                  <div className="illustration-panda-wrapper">
                    <div className="room-illustration-panda" />
                  </div>
                </div>

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
