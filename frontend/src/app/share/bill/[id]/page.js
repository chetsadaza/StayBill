'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatTHB, formatBillingMonth, formatDate } from '@/lib/utils';

export default function ShareBillPage() {
  const params = useParams();
  const [bill, setBill] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{ color: '#6b7280', marginTop: 16 }}>กำลังโหลดใบแจ้งหนี้...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>😔</div>
          <h2 style={{ color: '#ef4444', marginBottom: 8 }}>ไม่พบใบแจ้งหนี้</h2>
          <p style={{ color: '#6b7280', maxWidth: 400, textAlign: 'center' }}>
            {error || 'ลิงก์นี้อาจไม่ถูกต้องหรือใบแจ้งหนี้ถูกลบไปแล้ว กรุณาติดต่อผู้ดูแลหอพัก'}
          </p>
        </div>
      </div>
    );
  }

  const subtotal = bill.monthlyRent +
    (bill.waterTotal || 0) +
    (bill.electricityTotal || 0) +
    ((bill.additionalCharges || []).reduce((sum, c) => sum + (c.amount || 0), 0));

  return (
    <div style={styles.page}>
      {/* Animated background */}
      <div style={styles.bgGradient}></div>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.dormName}>{settings?.dormitoryName || 'StayBill'}</h1>
            <p style={styles.dormAddress}>{settings?.address || ''}</p>
            {settings?.phone && <p style={styles.dormPhone}>📞 {settings.phone}</p>}
          </div>
          <div style={styles.headerRight}>
            <div style={styles.invoiceTitle}>ใบแจ้งหนี้</div>
            <div style={styles.invoiceMonth}>{formatBillingMonth(bill.billingMonth)}</div>
            {bill.isPaid && (
              <div style={styles.paidStamp}>✓ ชำระแล้ว</div>
            )}
          </div>
        </div>

        {/* Tenant & Room Info */}
        <div style={styles.infoGrid}>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>ผู้เช่า</div>
            <div style={styles.infoValue}>
              {bill.tenant?.firstName} {bill.tenant?.lastName}
            </div>
            {bill.tenant?.phone && (
              <div style={styles.infoSub}>📱 {bill.tenant.phone}</div>
            )}
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>ห้องพัก</div>
            <div style={styles.infoValue}>ห้อง {bill.room?.roomNumber}</div>
            <div style={styles.infoSub}>ชั้น {bill.room?.floor}</div>
          </div>
        </div>

        {/* Charges Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, textAlign: 'left'}}>รายการ</th>
                <th style={{...styles.th, textAlign: 'center'}}>รายละเอียด</th>
                <th style={{...styles.th, textAlign: 'right'}}>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {/* Rent */}
              <tr>
                <td style={{...styles.td, fontWeight: 600}}>ค่าเช่าห้องพัก</td>
                <td style={{...styles.td, textAlign: 'center', color: '#6b7280'}}>เหมาจ่ายรายเดือน</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>{formatTHB(bill.monthlyRent)}</td>
              </tr>

              {/* Water */}
              {bill.waterTotal > 0 && (
                <tr>
                  <td style={styles.td}>ค่าน้ำประปา</td>
                  <td style={{...styles.td, textAlign: 'center', color: '#6b7280', fontSize: '0.85rem'}}>
                    {bill.waterType === 'unit'
                      ? `${bill.waterPreviousMeter} → ${bill.waterCurrentMeter} (${bill.waterUnits} หน่วย × ${bill.waterRate} บ.)`
                      : 'เหมาจ่าย'
                    }
                  </td>
                  <td style={{...styles.td, textAlign: 'right'}}>{formatTHB(bill.waterTotal)}</td>
                </tr>
              )}

              {/* Electricity */}
              {bill.electricityTotal > 0 && (
                <tr>
                  <td style={styles.td}>ค่าไฟฟ้า</td>
                  <td style={{...styles.td, textAlign: 'center', color: '#6b7280', fontSize: '0.85rem'}}>
                    {bill.electricityType === 'unit'
                      ? `${bill.electricityPreviousMeter} → ${bill.electricityCurrentMeter} (${bill.electricityUnits} หน่วย × ${bill.electricityRate} บ.)`
                      : 'เหมาจ่าย'
                    }
                  </td>
                  <td style={{...styles.td, textAlign: 'right'}}>{formatTHB(bill.electricityTotal)}</td>
                </tr>
              )}

              {/* Additional Charges */}
              {bill.additionalCharges?.map((charge, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{charge.description}</td>
                  <td style={{...styles.td, textAlign: 'center', color: '#6b7280'}}>บริการเสริม</td>
                  <td style={{...styles.td, textAlign: 'right'}}>{formatTHB(charge.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={styles.totalsContainer}>
          <div style={styles.totalRow}>
            <span style={{ color: '#6b7280' }}>ยอดรวม (Subtotal)</span>
            <span style={{ fontWeight: 600 }}>{formatTHB(subtotal)}</span>
          </div>
          {bill.discount > 0 && (
            <div style={{...styles.totalRow, color: '#ef4444'}}>
              <span>ส่วนลด (Discount)</span>
              <span style={{ fontWeight: 600 }}>- {formatTHB(bill.discount)}</span>
            </div>
          )}
          <div style={styles.grandTotalRow}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>ยอดเรียกเก็บสุทธิ</span>
            <span style={styles.grandTotalAmount}>{formatTHB(bill.totalAmount)}</span>
          </div>
        </div>

        {/* Remarks */}
        {bill.remarks && (
          <div style={styles.remarksBox}>
            <strong>📝 หมายเหตุ:</strong> {bill.remarks}
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.6 }}>
            <p>• กรุณาชำระเงินภายในวันที่ 5 ของเดือน</p>
            <p>• สามารถชำระผ่านการโอนบัญชีธนาคารแล้วส่งหลักฐานให้ผู้ดูแล</p>
          </div>
          <div style={{ textAlign: 'center', marginTop: 20, color: '#d1d5db', fontSize: '0.75rem' }}>
            Powered by <strong>StayBill</strong> — ระบบจัดการหอพักอัจฉริยะ
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '24px 16px',
    fontFamily: "'Inter', 'Sarabun', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.12) 0%, transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  card: {
    width: '100%',
    maxWidth: 650,
    background: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    color: '#111827',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '28px 28px 20px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: '#ffffff',
    gap: 16,
    flexWrap: 'wrap',
  },
  headerLeft: {
    flex: 1,
    minWidth: 180,
  },
  headerRight: {
    textAlign: 'right',
  },
  dormName: {
    fontSize: '1.4rem',
    fontWeight: 700,
    margin: '0 0 4px',
    fontFamily: "'Outfit', 'Sarabun', sans-serif",
  },
  dormAddress: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.8)',
    maxWidth: 280,
    lineHeight: 1.4,
    margin: 0,
  },
  dormPhone: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  invoiceTitle: {
    fontSize: '1.6rem',
    fontWeight: 800,
    fontFamily: "'Outfit', 'Sarabun', sans-serif",
  },
  invoiceMonth: {
    fontSize: '0.85rem',
    background: 'rgba(255,255,255,0.2)',
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 4,
    marginTop: 6,
    fontWeight: 600,
  },
  paidStamp: {
    marginTop: 10,
    display: 'inline-block',
    border: '2px solid #34d399',
    color: '#34d399',
    padding: '2px 12px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.8rem',
    transform: 'rotate(-3deg)',
    background: 'rgba(52,211,153,0.1)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    padding: '20px 28px',
  },
  infoBox: {
    background: '#f9fafb',
    borderRadius: 12,
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#111827',
  },
  infoSub: {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: 2,
  },
  tableContainer: {
    padding: '0 28px',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 8px',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '0.85rem',
    color: '#374151',
    fontWeight: 600,
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.9rem',
    color: '#374151',
  },
  totalsContainer: {
    margin: '16px 28px 0',
    background: '#f9fafb',
    borderRadius: 12,
    padding: '16px 20px',
    border: '1px solid #e5e7eb',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '0.9rem',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0 4px',
    borderTop: '2px solid #4f46e5',
    marginTop: 8,
  },
  grandTotalAmount: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#4f46e5',
  },
  remarksBox: {
    margin: '16px 28px 0',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: '0.85rem',
    color: '#dc2626',
    lineHeight: 1.5,
  },
  footer: {
    padding: '20px 28px 24px',
    borderTop: '1px solid #e5e7eb',
    marginTop: 20,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    zIndex: 1,
    position: 'relative',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    zIndex: 1,
    position: 'relative',
    color: '#f3f4f6',
  },
};
