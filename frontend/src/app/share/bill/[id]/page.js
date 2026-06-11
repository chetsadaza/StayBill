'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatTHB, formatBillingMonth } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MdPictureAsPdf, MdImage, MdCloudDownload } from 'react-icons/md';
import Toast from '@/components/ui/Toast';

export default function ShareBillPage() {
  const params = useParams();
  const [bill, setBill] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const printRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const [billRes, settingsRes] = await Promise.all([
          api.getBill(params.id),
          api.getSettings()
        ]);
        if (billRes.success) setBill(billRes.data);
        if (settingsRes.success) setSettings(settingsRes.data);
      } catch (err) {
        setError('ไม่พบใบแจ้งหนี้ หรือลิงก์ไม่ถูกต้อง');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchBill();
  }, [params.id]);

  // Generate PDF Invoice
  const generatePDF = async () => {
    if (!bill) return;
    const element = printRef.current;
    if (!element) return;

    try {
      showToast('กำลังเตรียมไฟล์ PDF...', 'info');
      element.classList.add('exporting');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      element.classList.remove('exporting');
      
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

      pdf.save(`ใบแจ้งหนี้_ห้อง${bill.room.roomNumber}_${bill.billingMonth}.pdf`);
      showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
    } catch (err) {
      if (element) element.classList.remove('exporting');
      console.error('Failed to generate PDF', err);
      showToast('ไม่สามารถแปลงใบแจ้งหนี้เป็น PDF ได้', 'error');
    }
  };

  // Generate PNG Image Invoice
  const generateImage = async () => {
    if (!bill) return;
    const element = printRef.current;
    if (!element) return;

    try {
      showToast('กำลังเตรียมไฟล์รูปภาพ...', 'info');
      element.classList.add('exporting');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      element.classList.remove('exporting');
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `ใบแจ้งหนี้_ห้อง${bill.room.roomNumber}_${bill.billingMonth}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('ดาวน์โหลดรูปภาพใบแจ้งหนี้สำเร็จ', 'success');
    } catch (err) {
      if (element) element.classList.remove('exporting');
      console.error('Failed to generate Image', err);
      showToast('ไม่สามารถแปลงใบแจ้งหนี้เป็นรูปภาพได้', 'error');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 16, fontSize: '0.95rem' }}>กำลังโหลดใบแจ้งหนี้...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={styles.errorPage}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>😔</div>
        <h2 style={{ color: 'var(--color-danger)', marginBottom: 8, fontWeight: 700 }}>ไม่พบใบแจ้งหนี้</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {error || 'ลิงก์นี้อาจไม่ถูกต้องหรือใบแจ้งหนี้ถูกลบไปแล้ว กรุณาติดต่อผู้ดูแลหอพัก'}
        </p>
      </div>
    );
  }

  const additionalChargesTotal = (bill.additionalCharges || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const subtotal = bill.monthlyRent + (bill.waterTotal || 0) + (bill.electricityTotal || 0) + additionalChargesTotal;

  return (
    <div className="share-bill-page">
      <div className="share-bill-action-header">
        <h3 className="share-bill-action-title">ใบแจ้งหนี้ค่าเช่าห้อง {bill.room?.roomNumber}</h3>
        <div className="share-bill-toolbar">
          <button className="btn btn-secondary" onClick={generateImage} style={styles.btnAction}>
            <MdImage size={18} /> โหลดรูปภาพ (PNG)
          </button>
          <button className="btn btn-primary" onClick={generatePDF} style={styles.btnActionPrimary}>
            <MdPictureAsPdf size={18} /> โหลด PDF
          </button>
        </div>
      </div>

      <div className="share-bill-paper-wrapper">
        <div 
          ref={printRef}
          className="invoice-paper"
          style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}
        >
          {/* Invoice Header */}
          <div className="invoice-header">
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#4f46e5', marginBottom: '4px' }}>
                {settings?.dormitoryName || 'หอพัก StayBill'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', maxWidth: '380px', lineHeight: '1.4' }}>
                {settings?.address || 'ข้อมูลที่อยู่หอพัก'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '4px' }}>
                โทร: {settings?.phone || '-'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                ใบแจ้งหนี้ค่าเช่า
              </h1>
              <span style={{ fontSize: '0.8rem', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px', fontWeight: 600, display: 'inline-block', marginTop: '8px' }}>
                ประจำเดือน: {formatBillingMonth(bill.billingMonth)}
              </span>
            </div>
          </div>

          {/* Tenant & Room details */}
          <div className="invoice-details-grid">
            <div className="invoice-card">
              <h4 className="invoice-card-title">ผู้เช่าห้องพัก</h4>
              <p className="invoice-card-value">คุณ {bill.tenant?.firstName} {bill.tenant?.lastName}</p>
              <p className="invoice-card-sub">เบอร์โทร: {bill.tenant?.phone || '-'}</p>
            </div>
            <div className="invoice-card">
              <h4 className="invoice-card-title">ข้อมูลห้องพัก</h4>
              <p className="invoice-card-value">ห้องพักหมายเลข {bill.room?.roomNumber}</p>
              <p className="invoice-card-sub">ชั้น: {bill.room?.floor} | ประเภทห้อง: Standard</p>
            </div>
          </div>

          {/* Table of charges */}
          <div className="invoice-table-wrapper">
            <table>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontSize: '0.9rem', color: '#374151' }}>รายการค่าบริการ</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontSize: '0.9rem', color: '#374151' }}>มิเตอร์เก่า</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontSize: '0.9rem', color: '#374151' }}>มิเตอร์ใหม่</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontSize: '0.9rem', color: '#374151' }}>จำนวนหน่วย / อัตรา</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', textAlign: 'right', fontSize: '0.9rem', color: '#374151' }}>ยอดสุทธิ (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {/* Monthly Rent */}
                <tr>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', fontWeight: 600 }}>ค่าเช่าห้องพักรายเดือน</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af' }}>-</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af' }}>-</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563', fontSize: '0.85rem' }}>เหมาจ่าย</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>{formatTHB(bill.monthlyRent)}</td>
                </tr>

                {/* Water charges */}
                {bill.waterTotal > 0 && (
                  <tr>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                      ค่าน้ำประปา {bill.waterType === 'flat' ? '(เหมาจ่าย)' : ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563' }}>
                      {bill.waterType === 'unit' ? bill.waterPreviousMeter : '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563' }}>
                      {bill.waterType === 'unit' ? bill.waterCurrentMeter : '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563', fontSize: '0.85rem' }}>
                      {bill.waterType === 'unit' ? `${bill.waterUnits} หน่วย @ ${bill.waterRate} บ.` : 'เหมาจ่าย'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{formatTHB(bill.waterTotal)}</td>
                  </tr>
                )}

                {/* Electricity charges */}
                {bill.electricityTotal > 0 && (
                  <tr>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                      ค่าไฟฟ้า {bill.electricityType === 'flat' ? '(เหมาจ่าย)' : ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563' }}>
                      {bill.electricityType === 'unit' ? bill.electricityPreviousMeter : '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563' }}>
                      {bill.electricityType === 'unit' ? bill.electricityCurrentMeter : '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563', fontSize: '0.85rem' }}>
                      {bill.electricityType === 'unit' ? `${bill.electricityUnits} หน่วย @ ${bill.electricityRate} บ.` : 'เหมาจ่าย'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{formatTHB(bill.electricityTotal)}</td>
                  </tr>
                )}

                {/* Additional Charges */}
                {bill.additionalCharges && bill.additionalCharges.length > 0 && (
                  bill.additionalCharges.map((charge, cIdx) => (
                    <tr key={cIdx}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>{charge.description}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af' }}>-</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af' }}>-</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#4b5563', fontSize: '0.85rem' }}>บริการเสริม</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{formatTHB(charge.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PDF totals */}
          <div className="invoice-totals-container">
            <div className="invoice-totals-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>ยอดรวม (Subtotal)</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatTHB(subtotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', color: '#ef4444' }}>
                  <span style={{ fontSize: '0.9rem' }}>ส่วนลด (Discount)</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>- {formatTHB(bill.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '3px double #4f46e5' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>ยอดเรียกเก็บสุทธิ</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#4f46e5' }}>{formatTHB(bill.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Sign off and notes */}
          <div className="invoice-footer-grid">
            <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: '1.5' }}>
              <p style={{ fontWeight: 600, color: '#374151', marginBottom: '6px' }}>หมายเหตุ:</p>
              {bill.remarks && (
                <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>
                  * หมายเหตุเพิ่มเติม: {bill.remarks}
                </p>
              )}
              <p>1. กรุณาชำระเงินภายในวันที่ 5 ของเดือน เพื่อหลีกเลี่ยงค่าปรับล่าช้า</p>
              <p>2. สามารถชำระผ่านการโอนบัญชีธนาคารแล้วส่งหลักฐานให้กับผู้ดูแลระบบ</p>
            </div>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ height: '40px' }}>
                {bill.isPaid && (
                  <div style={{ border: '2px solid #10b981', color: '#10b981', padding: '2px 10px', borderRadius: '4px', transform: 'rotate(-5deg)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    ชำระเงินเรียบร้อยแล้ว
                  </div>
                )}
              </div>
              <div style={{ width: '150px', borderBottom: '1px solid #d1d5db', margin: '8px 0 16px 0' }}></div>
              <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>ผู้ดูแลหอพัก / ผู้รับเงิน</p>
            </div>
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '40px',
  },
  actionHeader: {
    width: '100%',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    padding: '12px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  actionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  btnAction: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  btnActionPrimary: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  paperWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  loadingPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  errorPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: '24px',
  },
};
