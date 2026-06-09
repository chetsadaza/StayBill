'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTHB } from '@/lib/utils';
import { MdInsertChart, MdFileDownload, MdCalendarToday, MdExpandMore, MdExpandLess } from 'react-icons/md';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRevenue(selectedYear);
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลรายงานรายรับได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.monthly) return;
    
    // CSV headers
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel Thai language support
    csvContent += "เดือน,ยอดรวมค่าเช่า,ยอดรวมค่าน้ำ,ยอดรวมค่าไฟ,รายรับอื่นๆ,รายรับสุทธิ (บาท)\n";

    // Row data
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
      'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
      'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    reportData.monthly.forEach((item, idx) => {
      csvContent += `${months[idx]},${item.rentRevenue},${item.waterRevenue},${item.electricityRevenue},${item.otherRevenue},${item.totalRevenue}\n`;
    });

    // Download trigger
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานรายรับ_ปี_${selectedYear + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Setup Stacked Chart Data
  const chartData = {
    labels: [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ],
    datasets: [
      {
        label: 'ค่าเช่าห้องพัก',
        data: reportData?.monthly?.map(m => m.rentRevenue) || Array(12).fill(0),
        backgroundColor: '#6366f1', // Indigo
      },
      {
        label: 'ค่าน้ำประปา',
        data: reportData?.monthly?.map(m => m.waterRevenue) || Array(12).fill(0),
        backgroundColor: '#3b82f6', // Info blue
      },
      {
        label: 'ค่าไฟฟ้า',
        data: reportData?.monthly?.map(m => m.electricityRevenue) || Array(12).fill(0),
        backgroundColor: '#f59e0b', // Warning yellow
      },
      {
        label: 'บริการเสริม/อื่นๆ',
        data: reportData?.monthly?.map(m => m.otherRevenue) || Array(12).fill(0),
        backgroundColor: '#10b981', // Success green
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#9ca3af', font: { family: 'Inter' } }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  return (
    <>
      {/* Title */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>รายงานและวิเคราะห์รายรับ</h2>
          <p style={{ color: 'var(--text-secondary)' }}>สรุปสัดส่วนรายรับรายปี แยกประเภทรายได้ และออกรายงานข้อมูลรายรับ</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExportCSV} disabled={!reportData}>
          <MdFileDownload size={20} /> ส่งออกรายงาน (CSV)
        </button>
      </div>

      {/* Year Selector */}
      <div className="glass-card filter-bar">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <MdCalendarToday size={18} /> เลือกปีรายงาน (พ.ศ.):
        </span>
        <select 
          className="form-input" 
          style={{ width: '150px', padding: '8px 12px' }}
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
            <option key={year} value={year}>{year + 543}</option>
          ))}
        </select>
      </div>

      {/* Summary card */}
      <div className="glass-card" style={{ background: 'var(--accent-gradient)', border: 'none', color: '#ffffff' }}>
        <span style={{ fontSize: '0.95rem', opacity: 0.85 }}>ยอดรายรับสุทธิสะสมประจำปี {selectedYear + 543}</span>
        <h3 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '8px' }}>{formatTHB(reportData?.totalYearRevenue)}</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '4px' }}>* อ้างอิงจากข้อมูลบิลค่าเช่าที่ได้รับการบันทึกว่า "ชำระเงินเรียบร้อยแล้ว"</p>
      </div>

      {/* Stacked Chart */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.15rem' }}>วิเคราะห์รายได้ในแต่ละเดือน</h3>
        <div style={{ height: '350px', position: 'relative' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Monthly details Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.15rem' }}>ตารางแจกแจงรายรับประจำปี (รายเดือน)</h3>
        </div>

        {/* Desktop Table View */}
        <div className="custom-table-container desktop-only">
          <table className="custom-table">
            <thead>
              <tr>
                <th>เดือน</th>
                <th>จำนวนบิลทั้งหมด</th>
                <th>ค่าเช่าสุทธิ</th>
                <th>ค่าน้ำสุทธิ</th>
                <th>ค่าไฟสุทธิ</th>
                <th>อื่นๆ/บริการเสริม</th>
                <th style={{ color: 'var(--accent-primary)' }}>ยอดรายรับจริง</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>กำลังโหลดข้อมูลรายงานรายรับ...</td>
                </tr>
              ) : reportData?.monthly ? (
                reportData.monthly.map((monthItem, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{thaiMonths[idx]}</td>
                    <td>{monthItem.totalBills} บิล (ชำระ {monthItem.paidCount})</td>
                    <td>{formatTHB(monthItem.rentRevenue)}</td>
                    <td>{formatTHB(monthItem.waterRevenue)}</td>
                    <td>{formatTHB(monthItem.electricityRevenue)}</td>
                    <td>{formatTHB(monthItem.otherRevenue)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatTHB(monthItem.totalRevenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>ไม่มีข้อมูลรายงาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid View */}
        <div className="mobile-only" style={{ padding: '12px', gap: '0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูล...</div>
          ) : reportData?.monthly ? (
            <>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '8px',
              }}>
                {reportData.monthly.map((monthItem, idx) => {
                  const isExpanded = expandedMonth === idx;
                  const hasRevenue = monthItem.totalRevenue > 0;
                  return (
                    <div 
                      key={idx}
                      style={{
                        gridColumn: isExpanded ? '1 / -1' : 'auto',
                      }}
                    >
                      <div
                        onClick={() => setExpandedMonth(isExpanded ? null : idx)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '12px 6px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          background: isExpanded 
                            ? 'var(--accent-gradient)' 
                            : hasRevenue 
                              ? 'var(--bg-card-hover)' 
                              : 'var(--bg-card)',
                          border: isExpanded 
                            ? '1px solid transparent' 
                            : hasRevenue 
                              ? '1px solid var(--border-hover)' 
                              : '1px solid var(--border-color)',
                          transition: 'var(--transition-fast)',
                          color: isExpanded ? '#fff' : 'inherit',
                        }}
                      >
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 700, 
                          fontFamily: 'var(--font-heading)',
                          color: isExpanded ? '#fff' : 'var(--text-primary)',
                        }}>
                          {thaiMonths[idx]}
                        </span>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          color: isExpanded ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                        }}>
                          {monthItem.paidCount}/{monthItem.totalBills} ชำระ
                        </span>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 700,
                          color: isExpanded 
                            ? '#fff' 
                            : hasRevenue 
                              ? 'var(--color-success)' 
                              : 'var(--text-muted)',
                          marginTop: '2px',
                        }}>
                          {hasRevenue ? formatTHB(monthItem.totalRevenue) : '฿0'}
                        </span>
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div style={{
                          marginTop: '8px',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          animation: 'pageFadeIn 0.2s ease-out',
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">ค่าเช่า:</span>
                              <span className="mobile-card-value">{formatTHB(monthItem.rentRevenue)}</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">ค่าน้ำ:</span>
                              <span className="mobile-card-value">{formatTHB(monthItem.waterRevenue)}</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">ค่าไฟ:</span>
                              <span className="mobile-card-value">{formatTHB(monthItem.electricityRevenue)}</span>
                            </div>
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">อื่นๆ/เสริม:</span>
                              <span className="mobile-card-value">{formatTHB(monthItem.otherRevenue)}</span>
                            </div>
                            <div className="mobile-card-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
                              <span className="mobile-card-label" style={{ fontWeight: 700 }}>ยอดรวมรายรับจริง:</span>
                              <span className="mobile-card-value" style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                                {formatTHB(monthItem.totalRevenue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>ไม่มีข้อมูลรายงาน</div>
          )}
        </div>
      </div>
    </>
  );
}
