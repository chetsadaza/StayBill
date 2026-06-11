import { formatTHB, formatBillingMonth } from '@/lib/utils';
import InvoiceChargesTable from '@/components/billing/InvoiceChargesTable';

export default function InvoiceDocument({ bill, settings, printRef, className = '' }) {
  if (!bill) return null;

  const additionalTotal = (bill.additionalCharges || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const subtotal =
    bill.monthlyRent + (bill.waterTotal || 0) + (bill.electricityTotal || 0) + additionalTotal;

  return (
    <div ref={printRef} className={`invoice-paper ${className}`.trim()}>
      <div className="invoice-header">
        <div className="invoice-header-brand">
          <h2>{settings?.dormitoryName || 'หอพัก StayBill'}</h2>
          <p>{settings?.address || 'ข้อมูลที่อยู่หอพัก'}</p>
          <p className="invoice-header-phone">โทร: {settings?.phone || '-'}</p>
        </div>
        <div className="invoice-header-title-block">
          <h1>ใบแจ้งหนี้ค่าเช่า</h1>
          <div className="invoice-header-badges">
            <span className="invoice-month-badge">
              ประจำเดือน {formatBillingMonth(bill.billingMonth)}
            </span>
            {bill.isPaid && (
              <span className="invoice-paid-stamp">ชำระแล้ว</span>
            )}
          </div>
        </div>
      </div>

      <div className="invoice-details-grid">
        <div className="invoice-card">
          <h4 className="invoice-card-title">ผู้เช่าห้องพัก</h4>
          <p className="invoice-card-value">
            คุณ {bill.tenant?.firstName} {bill.tenant?.lastName}
          </p>
          <p className="invoice-card-sub">เบอร์โทร: {bill.tenant?.phone || '-'}</p>
        </div>
        <div className="invoice-card">
          <h4 className="invoice-card-title">ข้อมูลห้องพัก</h4>
          <p className="invoice-card-value">ห้องพักหมายเลข {bill.room?.roomNumber}</p>
          <p className="invoice-card-sub">
            ชั้น: {bill.room?.floor} | ประเภทห้อง: Standard
          </p>
        </div>
      </div>

      <InvoiceChargesTable bill={bill} />

      <div className="invoice-totals-container">
        <div className="invoice-totals-box">
          <div className="invoice-total-row">
            <span>ยอดรวม (Subtotal)</span>
            <span>{formatTHB(subtotal)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="invoice-total-row invoice-total-row--discount">
              <span>ส่วนลด (Discount)</span>
              <span>- {formatTHB(bill.discount)}</span>
            </div>
          )}
          <div className="invoice-total-row invoice-total-row--grand">
            <span>ยอดเรียกเก็บสุทธิ</span>
            <span>{formatTHB(bill.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="invoice-footer-grid">
        <div className="invoice-notes">
          <p className="invoice-notes-title">หมายเหตุ</p>
          {bill.remarks && (
            <p className="invoice-notes-remark">* {bill.remarks}</p>
          )}
          <p>1. กรุณาชำระเงินภายในวันที่ 5 ของเดือน เพื่อหลีกเลี่ยงค่าปรับล่าช้า</p>
          <p>2. สามารถชำระผ่านการโอนบัญชีธนาคารแล้วส่งหลักฐานให้กับผู้ดูแลระบบ</p>
        </div>
        <div className="invoice-signature">
          <div className="invoice-signature-line" />
          <p>ผู้ดูแลหอพัก / ผู้รับเงิน</p>
        </div>
      </div>
    </div>
  );
}
