'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { formatTHB, formatBillingMonth } from '@/lib/utils';
import { BILL_STATUS, WATER_TYPES, ELECTRICITY_TYPES } from '@/lib/constants';
import { 
  MdAdd, 
  MdReceipt, 
  MdCheckCircle, 
  MdPictureAsPdf, 
  MdImage,
  MdDelete, 
  MdEdit, 
  MdClose,
  MdAutoAwesome,
  MdAttachMoney,
  MdExpandMore,
  MdExpandLess,
  MdSend,
  MdQrCodeScanner
} from 'react-icons/md';

import jsPDF from 'jspdf';
import { captureInvoiceForExport } from '@/lib/invoiceExport';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import InvoiceDocument from '@/components/billing/InvoiceDocument';

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Custom alert states
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const triggerConfirm = (message, onConfirm) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  // Modal for generating bills
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [meterForm, setMeterForm] = useState([]); // Array of { roomId, roomNumber, waterPreviousMeter, waterCurrentMeter, electricityPreviousMeter, electricityCurrentMeter, additionalCharges: [] }
  const [settings, setSettings] = useState(null);
  const [expandedRooms, setExpandedRooms] = useState({});

  const toggleExpandRoom = (roomId) => {
    setExpandedRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  // Modal for viewing/printing a single bill
  const [activeBill, setActiveBill] = useState(null);
  const printRef = useRef(null);



  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch bills for selected month
      const billsRes = await api.getBills({ month: selectedMonth });
      if (billsRes.success) {
        setBills(billsRes.data);
      }

      // Fetch settings
      const setRes = await api.getSettings();
      if (setRes.success) {
        setSettings(setRes.data);
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลบิลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  useEffect(() => {
    if (!activeBill && !isGenModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [activeBill, isGenModalOpen]);

  // Load occupied rooms to prepare for generating bills
  const handleOpenGenModal = async () => {
    try {
      const roomsRes = await api.getRooms({ status: 'occupied' });
      if (roomsRes.success) {
        // For each room, try to pre-populate previous meter values based on their last bills
        const occupiedRooms = roomsRes.data;
        const initialMeterForm = [];

        for (const room of occupiedRooms) {
          // Default previous readings
          let prevWater = 0;
          let prevElec = 0;

          // Fetch last bill of this room to get current meter as the next previous meter
          try {
            // Get all bills for this room
            const roomBills = await api.getBills();
            if (roomBills.success && roomBills.data.length > 0) {
              // Sort by date
              const sorted = roomBills.data
                .filter(b => String(b.room._id) === String(room._id))
                .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
              
              if (sorted.length > 0) {
                prevWater = sorted[0].waterCurrentMeter || 0;
                prevElec = sorted[0].electricityCurrentMeter || 0;
              }
            }
          } catch (err) {
            console.error('Failed to fetch last bill for room', room.roomNumber, err);
          }

          const needsMeter = room.waterType === 'unit' || room.electricityType === 'unit';
          initialMeterForm.push({
            roomId: room._id,
            roomNumber: room.roomNumber,
            waterType: room.waterType,
            waterPreviousMeter: prevWater,
            waterCurrentMeter: prevWater, // default to previous meter
            electricityType: room.electricityType,
            electricityPreviousMeter: prevElec,
            electricityCurrentMeter: prevElec, // default to previous meter
            additionalCharges: [],
            discount: 0,
            remarks: '',
            selected: !needsMeter // default to true if flat/free (no meters to fill), false if needs meter reading
          });
        }

        // Expand the first room by default, others collapsed
        const initialExpanded = {};
        if (occupiedRooms.length > 0) {
          initialExpanded[occupiedRooms[0]._id] = true;
        }
        setExpandedRooms(initialExpanded);

        setRooms(occupiedRooms);
        setMeterForm(initialMeterForm);
        setIsGenModalOpen(true);
      }
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลห้องเพื่อเตรียมคำนวณบิลได้', 'error');
    }
  };

  const handleMeterChange = (index, field, value) => {
    setMeterForm(prev => {
      const updated = [...prev];
      let parsedValue = value;
      if (field !== 'remarks') {
        parsedValue = value === '' ? '' : Number(value);
      }
      
      // Auto-select the room if current meter is updated to be different from previous, or discount/remarks added
      let selected = updated[index].selected;
      if (field === 'waterCurrentMeter' && parsedValue !== updated[index].waterPreviousMeter) {
        selected = true;
      } else if (field === 'electricityCurrentMeter' && parsedValue !== updated[index].electricityPreviousMeter) {
        selected = true;
      } else if (field === 'discount' && parsedValue > 0) {
        selected = true;
      } else if (field === 'remarks' && parsedValue !== '') {
        selected = true;
      }

      updated[index] = {
        ...updated[index],
        [field]: parsedValue,
        selected
      };
      return updated;
    });
  };

  const handleToggleSelect = (index) => {
    setMeterForm(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        selected: !updated[index].selected
      };
      return updated;
    });
  };

  const handleAddCharge = (roomIndex) => {
    setMeterForm(prev => {
      const updated = [...prev];
      updated[roomIndex].additionalCharges.push({ description: 'บริการอินเทอร์เน็ต/อื่นๆ', amount: 100 });
      updated[roomIndex].selected = true; // Auto select on new charge
      return updated;
    });
  };

  const handleRemoveCharge = (roomIndex, chargeIndex) => {
    setMeterForm(prev => {
      const updated = [...prev];
      updated[roomIndex].additionalCharges.splice(chargeIndex, 1);
      return updated;
    });
  };

  const handleChargeChange = (roomIndex, chargeIndex, field, value) => {
    setMeterForm(prev => {
      const updated = [...prev];
      const parsedVal = field === 'amount' ? (value === '' ? '' : Number(value)) : value;
      updated[roomIndex].additionalCharges[chargeIndex] = {
        ...updated[roomIndex].additionalCharges[chargeIndex],
        [field]: parsedVal
      };
      updated[roomIndex].selected = true; // Auto select on charge change
      return updated;
    });
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      // Filter to only include selected rooms
      const selectedReadings = meterForm.filter(item => item.selected);
      
      if (selectedReadings.length === 0) {
        showToast('กรุณาเลือกห้องพักที่ต้องการสร้างบิลอย่างน้อย 1 ห้อง', 'warning');
        return;
      }

      // Sanitize inputs: convert empty strings to 0 before sending to API
      const sanitizedMeterReadings = selectedReadings.map(item => ({
        ...item,
        waterPreviousMeter: item.waterPreviousMeter === '' ? 0 : item.waterPreviousMeter,
        waterCurrentMeter: item.waterCurrentMeter === '' ? 0 : item.waterCurrentMeter,
        electricityPreviousMeter: item.electricityPreviousMeter === '' ? 0 : item.electricityPreviousMeter,
        electricityCurrentMeter: item.electricityCurrentMeter === '' ? 0 : item.electricityCurrentMeter,
        discount: item.discount === '' ? 0 : item.discount,
        additionalCharges: item.additionalCharges.map(charge => ({
          ...charge,
          amount: charge.amount === '' ? 0 : charge.amount
        }))
      }));

      const res = await api.generateBills({
        billingMonth: selectedMonth,
        meterReadings: sanitizedMeterReadings
      });

      if (res.success) {
        let msg = `คำนวณบิลห้องพักเรียบร้อยทั้งหมด ${res.count} ห้อง`;
        if (res.errors) {
          msg += `\n\nพบข้อผิดพลาดบางส่วน:\n` + res.errors.join('\n');
        }
        showToast(msg, res.errors ? 'warning' : 'success');
        setIsGenModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการคำนวณบิล', 'error');
    }
  };

  const handlePayBill = (id, roomNumber) => {
    triggerConfirm(
      `คุณได้รับเงินค่าเช่าสำหรับห้อง ${roomNumber} เรียบร้อยแล้วใช่ไหม?`,
      async () => {
        try {
          const res = await api.payBill(id);
          if (res.success) {
            showToast('บันทึกการชำระเงินสำเร็จ', 'success');
            fetchData();
          }
        } catch (err) {
          showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
        }
      }
    );
  };

  const handleDeleteBill = (id, roomNumber) => {
    triggerConfirm(
      `คุณแน่ใจว่าต้องการลบบิลห้อง ${roomNumber} หรือไม่?`,
      async () => {
        try {
          const res = await api.deleteBill(id);
          if (res.success) {
            showToast('ลบบิลเรียบร้อยแล้ว', 'success');
            fetchData();
          }
        } catch (err) {
          showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
        }
      }
    );
  };

  const handleSlipUpload = async (billId, roomNumber, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('ขนาดไฟล์รูปภาพสลิปต้องไม่เกิน 5MB', 'warning');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result;
      try {
        showToast(`กำลังตรวจสอบสลิปสำหรับห้อง ${roomNumber}...`, 'info');
        const res = await api.verifySlip(billId, { imageBase64: base64data });
        if (res.success) {
          showToast(`ตรวจสลิปสำเร็จ! ยอดเงิน ฿${res.data.amount.toLocaleString()} โอนเรียบร้อย ระบบปิดยอดค้างชำระแล้ว`, 'success');
          fetchData();
        }
      } catch (err) {
        showToast(err.message || 'การตรวจสอบสลิปขัดข้อง', 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send bill to LINE
  const handleSendLine = async (bill, roomNumber) => {
    try {
      showToast('กำลังส่งบิลไป LINE...', 'info');
      const res = await api.sendBillToLine(bill._id);
      if (res.success) {
        showToast(res.message || `ส่งบิลห้อง ${roomNumber} ไป LINE เรียบร้อยแล้ว`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'ไม่สามารถส่งบิลไป LINE ได้ ตรวจสอบว่าผู้เช่าเชื่อมต่อ LINE แล้ว', 'error');
    }
  };

  // Generate PDF Invoice
  const generatePDF = async () => {
    if (!activeBill) return;
    
    const element = printRef.current;
    if (!element) return;

    try {
      showToast('กำลังเตรียมไฟล์ PDF...', 'info');
      const canvas = await captureInvoiceForExport(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 Width
      const pageHeight = 295; // A4 Height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ใบแจ้งหนี้_ห้อง${activeBill.room.roomNumber}_${activeBill.billingMonth}.pdf`);
      showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
    } catch (err) {
      console.error('Failed to generate PDF', err);
      showToast('ไม่สามารถแปลงใบแจ้งหนี้เป็น PDF ได้', 'error');
    }
  };

  // Generate PNG Image Invoice
  const generateImage = async () => {
    if (!activeBill) return;
    
    const element = printRef.current;
    if (!element) return;

    try {
      showToast('กำลังเตรียมไฟล์รูปภาพ...', 'info');
      const canvas = await captureInvoiceForExport(element);
      const imgData = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `ใบแจ้งหนี้_ห้อง${activeBill.room.roomNumber}_${activeBill.billingMonth}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('ดาวน์โหลดรูปภาพใบแจ้งหนี้สำเร็จ', 'success');
    } catch (err) {
      console.error('Failed to generate Image', err);
      showToast('ไม่สามารถแปลงใบแจ้งหนี้เป็นรูปภาพได้', 'error');
    }
  };

  return (
    <>
      {/* Title */}
      <div className="page-header">
        <div>
          <h2 className="page-title">คำนวณบิลค่าเช่าและพิมพ์ใบแจ้งหนี้</h2>
          <p className="page-subtitle">สร้างใบแจ้งหนี้รายเดือนอัตโนมัติ บันทึกจ่ายเงิน และพิมพ์ใบแจ้งหนี้ PDF</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenGenModal}>
          <MdAutoAwesome size={20} /> คำนวณบิลประจำเดือน
        </button>
      </div>

      {/* Month Selector */}
      <div className="glass-card filter-bar">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>เลือกเดือนเรียกเก็บเงิน:</span>
        <input 
          type="month" 
          className="form-input filter-control" 
          style={{ padding: '8px 12px' }}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* Bills display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดข้อมูลบิล...</div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
      ) : bills.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div>
            <MdReceipt size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3>ไม่มีบิลค่าเช่าในเดือน {formatBillingMonth(selectedMonth)}</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '8px', marginBottom: '24px' }}>คุณยังไม่ได้สร้างบิลหรือคำนวณบิลให้กับห้องพักประจำเดือนนี้</p>
            <button className="btn btn-primary" onClick={handleOpenGenModal}>สร้างบิลตอนนี้</button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="custom-table-container desktop-only">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>เลขห้อง</th>
                  <th>ผู้เช่า</th>
                  <th>ยอดรวมทั้งสิ้น</th>
                  <th>สถานะชำระเงิน</th>
                  <th>แก้ไขล่าสุด</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill._id}>
                    <td style={{ fontWeight: 600, fontSize: '1.05rem' }}>ห้อง {bill.room?.roomNumber}</td>
                    <td>{bill.tenant ? `${bill.tenant.firstName} ${bill.tenant.lastName}` : 'ไม่มีข้อมูลผู้เช่า'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatTHB(bill.totalAmount)}</td>
                    <td>
                      {bill.isPaid ? (
                        <span className="badge badge-success">ชำระแล้ว</span>
                      ) : (
                        <span className="badge badge-warning">ค้างชำระ</span>
                      )}
                    </td>
                    <td>{new Date(bill.updatedAt).toLocaleDateString('th-TH')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setActiveBill(bill)}
                        >
                          <MdPictureAsPdf size={14} /> ดู/พิมพ์ PDF
                        </button>
                        
                        {!bill.isPaid && (
                          <>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--color-success)' }}
                              onClick={() => handlePayBill(bill._id, bill.room.roomNumber)}
                            >
                              <MdCheckCircle size={14} /> จ่ายแล้ว
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--color-success)', color: 'var(--color-success)', background: 'transparent' }}
                              onClick={() => document.getElementById(`slip-upload-${bill._id}`).click()}
                            >
                              <MdQrCodeScanner size={14} /> ตรวจสลิป
                            </button>
                            <input 
                              type="file" 
                              id={`slip-upload-${bill._id}`} 
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleSlipUpload(bill._id, bill.room.roomNumber, e)}
                            />
                          </>
                        )}

                        {bill.tenant?.lineUserId && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#06c755' }}
                            onClick={() => handleSendLine(bill, bill.room?.roomNumber)}
                          >
                            <MdSend size={14} /> ส่ง LINE
                          </button>
                        )}

                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px' }}
                          onClick={() => handleDeleteBill(bill._id, bill.room.roomNumber)}
                        >
                          <MdDelete size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-only" style={{ gap: '16px' }}>
            {bills.map((bill) => (
              <div key={bill._id} className="mobile-card">
                <div className="mobile-card-header">
                  <span className="mobile-card-title" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    ห้อง {bill.room?.roomNumber}
                  </span>
                  {bill.isPaid ? (
                    <span className="badge badge-success">ชำระแล้ว</span>
                  ) : (
                    <span className="badge badge-warning">ค้างชำระ</span>
                  )}
                </div>
                <div className="mobile-card-body">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">ผู้เช่า:</span>
                    <span className="mobile-card-value">
                      {bill.tenant ? `${bill.tenant.firstName} ${bill.tenant.lastName}` : 'ไม่มีข้อมูลผู้เช่า'}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">ยอดเรียกเก็บสุทธิ:</span>
                    <span className="mobile-card-value" style={{ fontWeight: 700, color: bill.isPaid ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatTHB(bill.totalAmount)}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">แก้ไขล่าสุดเมื่อ:</span>
                    <span className="mobile-card-value">
                      {new Date(bill.updatedAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                </div>
                <div className="mobile-card-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setActiveBill(bill)}
                  >
                    <MdPictureAsPdf size={14} /> พิมพ์ PDF
                  </button>
                  
                  {!bill.isPaid && (
                    <>
                      <button 
                        className="btn btn-primary" 
                        style={{ background: 'var(--color-success)' }}
                        onClick={() => handlePayBill(bill._id, bill.room.roomNumber)}
                      >
                        <MdCheckCircle size={14} /> จ่ายแล้ว
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', background: 'transparent' }}
                        onClick={() => document.getElementById(`slip-upload-mobile-${bill._id}`).click()}
                      >
                        <MdQrCodeScanner size={14} /> ตรวจสลิป
                      </button>
                      <input 
                        type="file" 
                        id={`slip-upload-mobile-${bill._id}`} 
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleSlipUpload(bill._id, bill.room.roomNumber, e)}
                      />
                    </>
                  )}

                  {bill.tenant?.lineUserId && (
                    <button 
                      className="btn btn-primary" 
                      style={{ background: '#06c755', flex: '1' }}
                      onClick={() => handleSendLine(bill, bill.room?.roomNumber)}
                    >
                      <MdSend size={14} /> ส่ง LINE
                    </button>
                  )}

                  <button 
                    className="btn btn-danger" 
                    style={{ flex: '0 0 42px', padding: '8px' }}
                    onClick={() => handleDeleteBill(bill._id, bill.room.roomNumber)}
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Auto-Calculate / Input Meter Readings */}
      {isGenModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--wide">
            <div className="modal-header">
              <h3 className="modal-title">คำนวณบิลสำหรับเดือน {formatBillingMonth(selectedMonth)}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsGenModalOpen(false)} aria-label="ปิด">
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="modal-form">
              <div className="modal-body modal-body-form">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, flex: 1 }}>
                    กรุณากรอกเลขมิเตอร์น้ำและไฟเดือนปัจจุบันสำหรับห้องที่คิดค่าบริการตามหน่วยใช้งาน:
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      const allExpanded = meterForm.every(item => expandedRooms[item.roomId]);
                      const newExpanded = {};
                      meterForm.forEach(item => {
                        newExpanded[item.roomId] = !allExpanded;
                      });
                      setExpandedRooms(newExpanded);
                    }}
                  >
                    {meterForm.every(item => expandedRooms[item.roomId]) ? 'หดทั้งหมด' : 'ขยายทั้งหมด'}
                  </button>
                </div>
                
                {meterForm.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>ไม่มีห้องที่มีสัญญาผู้เช่าเช่าอยู่เพื่อทำรายการคำนวณบิล</div>
                ) : (
                  meterForm.map((item, idx) => {
                    const isExpanded = !!expandedRooms[item.roomId];
                    return (
                      <div 
                        key={item.roomId} 
                        style={{ 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '16px', 
                          padding: '16px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: isExpanded ? '16px' : '0px',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {/* Room Header Banner - Always Visible */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            paddingBottom: isExpanded ? '12px' : '0px',
                            borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                          }}
                          onClick={() => toggleExpandRoom(item.roomId)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={item.selected || false}
                              onChange={() => handleToggleSelect(idx)}
                              style={{ 
                                width: '18px', 
                                height: '18px', 
                                cursor: 'pointer',
                                accentColor: 'var(--accent-primary)'
                              }}
                            />
                            <h4 style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>ห้อง {item.roomNumber}</h4>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Short summary when collapsed */}
                            {!isExpanded && (
                              <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                {item.waterType === 'unit' && item.waterCurrentMeter > item.waterPreviousMeter && (
                                  <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)', padding: '2px 6px', borderRadius: '4px' }}>
                                    น้ำ: {item.waterCurrentMeter - item.waterPreviousMeter} หน่วย
                                  </span>
                                )}
                                {item.electricityType === 'unit' && item.electricityCurrentMeter > item.electricityPreviousMeter && (
                                  <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', padding: '2px 6px', borderRadius: '4px' }}>
                                    ไฟ: {item.electricityCurrentMeter - item.electricityPreviousMeter} หน่วย
                                  </span>
                                )}
                                {item.discount > 0 && (
                                  <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '2px 6px', borderRadius: '4px' }}>
                                    ลด ฿{item.discount}
                                  </span>
                                )}
                              </div>
                            )}

                            {item.selected ? (
                              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', fontWeight: 600 }}>
                                เลือกบิล
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                ข้าม
                              </span>
                            )}

                            {isExpanded ? <MdExpandLess size={24} style={{ color: 'var(--text-secondary)' }} /> : <MdExpandMore size={24} style={{ color: 'var(--text-secondary)' }} />}
                          </div>
                        </div>

                        {/* Collapsible content */}
                        {isExpanded && (
                          <div style={{ animation: 'pageFadeIn 0.2s ease-out', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                              gap: '16px' 
                            }}>
                              {/* Water Meter */}
                              {item.waterType === 'unit' ? (
                                <div style={{ 
                                  background: 'rgba(255, 255, 255, 0.02)', 
                                  padding: '14px', 
                                  borderRadius: '12px',
                                  border: '1px solid rgba(255, 255, 255, 0.04)'
                                }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--color-info)' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-info)' }}></span>
                                    เลขมิเตอร์น้ำ (หน่วย)
                                  </span>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ครั้งก่อน</label>
                                      <input 
                                        type="number" 
                                        className="form-input" 
                                        value={item.waterPreviousMeter}
                                        onChange={(e) => handleMeterChange(idx, 'waterPreviousMeter', e.target.value)}
                                        min="0"
                                        style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ปัจจุบัน</label>
                                      <input 
                                        type="number" 
                                        className="form-input" 
                                        value={item.waterCurrentMeter}
                                        onChange={(e) => handleMeterChange(idx, 'waterCurrentMeter', e.target.value)}
                                        min="0"
                                        style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  background: 'rgba(255, 255, 255, 0.01)', 
                                  padding: '14px', 
                                  borderRadius: '12px',
                                  border: '1px dashed var(--border-color)',
                                  display: 'flex', 
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '100%'
                                }}>
                                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    ค่าน้ำ: <strong style={{ color: 'var(--text-primary)' }}>{WATER_TYPES[item.waterType] || item.waterType}</strong>
                                  </span>
                                </div>
                              )}

                              {/* Electricity Meter */}
                              {item.electricityType === 'unit' ? (
                                <div style={{ 
                                  background: 'rgba(255, 255, 255, 0.02)', 
                                  padding: '14px', 
                                  borderRadius: '12px',
                                  border: '1px solid rgba(255, 255, 255, 0.04)'
                                }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--color-warning)' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }}></span>
                                    เลขมิเตอร์ไฟ (หน่วย)
                                  </span>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ครั้งก่อน</label>
                                      <input 
                                        type="number" 
                                        className="form-input" 
                                        value={item.electricityPreviousMeter}
                                        onChange={(e) => handleMeterChange(idx, 'electricityPreviousMeter', e.target.value)}
                                        min="0"
                                        style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ปัจจุบัน</label>
                                      <input 
                                        type="number" 
                                        className="form-input" 
                                        value={item.electricityCurrentMeter}
                                        onChange={(e) => handleMeterChange(idx, 'electricityCurrentMeter', e.target.value)}
                                        min="0"
                                        style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  background: 'rgba(255, 255, 255, 0.01)', 
                                  padding: '14px', 
                                  borderRadius: '12px',
                                  border: '1px dashed var(--border-color)',
                                  display: 'flex', 
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '100%'
                                }}>
                                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    ค่าไฟ: <strong style={{ color: 'var(--text-primary)' }}>{ELECTRICITY_TYPES[item.electricityType] || item.electricityType}</strong>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Additional Charges per room */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ค่าใช้จ่ายเพิ่มเติม (เช่น อินเทอร์เน็ต, ที่จอดรถ, ค่าปรับ)</span>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}
                                  onClick={() => handleAddCharge(idx)}
                                >
                                  + เพิ่มรายการ
                                </button>
                              </div>

                              {item.additionalCharges.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.005)' }}>
                                  ไม่มีค่าใช้จ่ายเพิ่มเติม
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {item.additionalCharges.map((charge, cIdx) => (
                                    <div key={cIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ flex: 2, padding: '8px 12px', fontSize: '0.85rem' }}
                                        value={charge.description}
                                        onChange={(e) => handleChargeChange(idx, cIdx, 'description', e.target.value)}
                                        placeholder="รายการบริการ"
                                      />
                                      <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                                        value={charge.amount}
                                        onChange={(e) => handleChargeChange(idx, cIdx, 'amount', e.target.value)}
                                        placeholder="จำนวนเงิน"
                                        min="0"
                                      />
                                      <button 
                                        type="button" 
                                        className="btn btn-danger" 
                                        style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                                        onClick={() => handleRemoveCharge(idx, cIdx)}
                                      >
                                        <MdDelete size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Discount & Remarks */}
                            <div style={{ 
                              borderTop: '1px solid var(--border-color)', 
                              paddingTop: '16px', 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                              gap: '16px' 
                            }}>
                              <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--color-danger)' }}>
                                  ส่วนลด (บาท)
                                </label>
                                <div style={{ position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>฿</span>
                                  <input 
                                    type="number" 
                                    className="form-input" 
                                    placeholder="0"
                                    value={item.discount || ''}
                                    onChange={(e) => handleMeterChange(idx, 'discount', e.target.value)}
                                    min="0"
                                    style={{ paddingLeft: '28px', paddingRight: '12px', height: '38px', fontSize: '0.9rem' }}
                                  />
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                  หมายเหตุประจำห้อง / บันทึกเพิ่มเติม
                                </label>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  placeholder="เช่น คืนค่าประกัน, หักค่าซ่อมอุปกรณ์"
                                  value={item.remarks || ''}
                                  onChange={(e) => handleMeterChange(idx, 'remarks', e.target.value)}
                                  style={{ height: '38px', fontSize: '0.9rem' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsGenModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={meterForm.length === 0}>สร้างบิลอัตโนมัติ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Drawer/Modal */}
      {activeBill && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--invoice">
            <div className="modal-header invoice-preview-header">
              <div className="invoice-preview-heading">
                <h3 className="modal-title">ใบแจ้งหนี้</h3>
                <p className="invoice-preview-subtitle">
                  ห้อง {activeBill.room?.roomNumber} · {formatBillingMonth(activeBill.billingMonth)}
                  {activeBill.isPaid && ' · ชำระแล้ว'}
                </p>
              </div>
              <div className="invoice-preview-toolbar">
                <button type="button" className="btn btn-secondary invoice-btn-icon" onClick={generateImage}>
                  <MdImage size={18} aria-hidden />
                  <span className="invoice-btn-label-short">PNG</span>
                  <span className="invoice-btn-label-full">ดาวน์โหลด PNG</span>
                </button>
                <button type="button" className="btn btn-primary invoice-btn-icon" onClick={generatePDF}>
                  <MdPictureAsPdf size={18} aria-hidden />
                  <span className="invoice-btn-label-short">PDF</span>
                  <span className="invoice-btn-label-full">ดาวน์โหลด PDF</span>
                </button>
                <button type="button" className="modal-close-btn" onClick={() => setActiveBill(null)} aria-label="ปิด">
                  <MdClose size={22} />
                </button>
              </div>
            </div>

            <div className="modal-form">
              <div className="modal-body invoice-preview-body">
                <InvoiceDocument
                  bill={activeBill}
                  settings={settings}
                  printRef={printRef}
                  className="invoice-paper--in-modal"
                />
              </div>
            </div>
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
