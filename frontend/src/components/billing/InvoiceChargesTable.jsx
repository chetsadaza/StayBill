import { formatTHB } from '@/lib/utils';

function MeterCell({ label, value, hideWhenDash = true }) {
  const display = value ?? '-';
  const hide = hideWhenDash && (display === '-' || display === '');
  return (
    <td data-label={label} className={hide ? 'invoice-cell-hide-mobile' : ''}>
      {display}
    </td>
  );
}

export default function InvoiceChargesTable({ bill }) {
  if (!bill) return null;

  return (
    <div className="invoice-table-wrapper">
      <p className="invoice-section-label">รายการค่าใช้จ่าย</p>
      <table className="invoice-charges-table">
        <colgroup>
          <col className="invoice-col-item" />
          <col className="invoice-col-meter" />
          <col className="invoice-col-meter" />
          <col className="invoice-col-rate" />
          <col className="invoice-col-amount" />
        </colgroup>
        <thead>
          <tr>
            <th>รายการค่าบริการ</th>
            <th>
              <span className="invoice-th-short" title="มิเตอร์เก่า">เก่า</span>
              <span className="invoice-th-full">มิเตอร์เก่า</span>
            </th>
            <th>
              <span className="invoice-th-short" title="มิเตอร์ใหม่">ใหม่</span>
              <span className="invoice-th-full">มิเตอร์ใหม่</span>
            </th>
            <th>
              <span className="invoice-th-short" title="จำนวนหน่วย / อัตรา">หน่วย/อัตรา</span>
              <span className="invoice-th-full">จำนวนหน่วย / อัตรา</span>
            </th>
            <th>
              <span className="invoice-th-short" title="ยอดสุทธิ (บาท)">ยอด (฿)</span>
              <span className="invoice-th-full">ยอดสุทธิ (บาท)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="invoice-item-name">ค่าเช่าห้องพักรายเดือน</td>
            <MeterCell label="มิเตอร์เก่า" value="-" />
            <MeterCell label="มิเตอร์ใหม่" value="-" />
            <td data-label="จำนวนหน่วย / อัตรา" className="invoice-cell-hide-mobile">เหมาจ่าย</td>
            <td className="invoice-item-total" data-label="ยอดสุทธิ">{formatTHB(bill.monthlyRent)}</td>
          </tr>

          {bill.waterTotal > 0 && (
            <tr>
              <td className="invoice-item-name">
                ค่าน้ำประปา {bill.waterType === 'flat' ? '(เหมาจ่าย)' : ''}
              </td>
              <MeterCell
                label="มิเตอร์เก่า"
                value={bill.waterType === 'unit' ? bill.waterPreviousMeter : '-'}
                hideWhenDash={bill.waterType !== 'unit'}
              />
              <MeterCell
                label="มิเตอร์ใหม่"
                value={bill.waterType === 'unit' ? bill.waterCurrentMeter : '-'}
                hideWhenDash={bill.waterType !== 'unit'}
              />
              <td data-label="จำนวนหน่วย / อัตรา">
                {bill.waterType === 'unit'
                  ? `${bill.waterUnits} หน่วย @ ${bill.waterRate} บ.`
                  : 'เหมาจ่าย'}
              </td>
              <td className="invoice-item-total" data-label="ยอดสุทธิ">{formatTHB(bill.waterTotal)}</td>
            </tr>
          )}

          {bill.electricityTotal > 0 && (
            <tr>
              <td className="invoice-item-name">
                ค่าไฟฟ้า {bill.electricityType === 'flat' ? '(เหมาจ่าย)' : ''}
              </td>
              <MeterCell
                label="มิเตอร์เก่า"
                value={bill.electricityType === 'unit' ? bill.electricityPreviousMeter : '-'}
                hideWhenDash={bill.electricityType !== 'unit'}
              />
              <MeterCell
                label="มิเตอร์ใหม่"
                value={bill.electricityType === 'unit' ? bill.electricityCurrentMeter : '-'}
                hideWhenDash={bill.electricityType !== 'unit'}
              />
              <td data-label="จำนวนหน่วย / อัตรา">
                {bill.electricityType === 'unit'
                  ? `${bill.electricityUnits} หน่วย @ ${bill.electricityRate} บ.`
                  : 'เหมาจ่าย'}
              </td>
              <td className="invoice-item-total" data-label="ยอดสุทธิ">{formatTHB(bill.electricityTotal)}</td>
            </tr>
          )}

          {bill.additionalCharges?.map((charge, cIdx) => (
            <tr key={cIdx}>
              <td className="invoice-item-name">{charge.description}</td>
              <MeterCell label="มิเตอร์เก่า" value="-" />
              <MeterCell label="มิเตอร์ใหม่" value="-" />
              <td data-label="จำนวนหน่วย / อัตรา" className="invoice-cell-hide-mobile">บริการเสริม</td>
              <td className="invoice-item-total" data-label="ยอดสุทธิ">{formatTHB(charge.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
