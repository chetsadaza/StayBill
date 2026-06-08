'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTHB } from '@/lib/utils';
import {
  MdMeetingRoom,
  MdPeople,
  MdAttachMoney,
  MdPayment,
  MdWarning,
  MdCheckCircle
} from 'react-icons/md';
import Link from 'next/link';

// Register Chart.js details dynamically to avoid SSR error
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [sumRes, revRes] = await Promise.all([
          api.getSummary(),
          api.getRevenue(new Date().getFullYear())
        ]);

        if (sumRes.success) setSummary(sumRes.data);
        if (revRes.success) setRevenueData(revRes.data);
      } catch (err) {
        console.error('Error loading dashboard data', err);
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลหรือดึงข้อมูลได้ กรุณาเปิด Backend และ MongoDB');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูลสถิติ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <MdWarning size={48} style={{ color: 'var(--color-danger)', marginBottom: '16px' }} />
        <h2 style={{ marginBottom: '12px' }}>เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>ลองใหม่อีกครั้ง</button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'ห้องพักทั้งหมด',
      value: summary?.totalRooms || 0,
      sub: `ว่าง ${summary?.availableRooms || 0} | ไม่ว่าง ${summary?.occupiedRooms || 0}`,
      icon: <MdMeetingRoom size={28} />,
      color: '#6366f1'
    },
    {
      title: 'ผู้เช่าทั้งหมด',
      value: summary?.activeTenants || 0,
      sub: 'สัญญาเช่าปัจจุบัน',
      icon: <MdPeople size={28} />,
      color: '#8b5cf6'
    },
    {
      title: 'รายรับเดือนนี้ (จ่ายแล้ว)',
      value: formatTHB(summary?.monthlyRevenue),
      sub: `ข้อมูลประจำเดือน ${summary?.currentMonth}`,
      icon: <MdAttachMoney size={28} />,
      color: '#10b981'
    },
    {
      title: 'ค้างชำระเดือนนี้',
      value: formatTHB(summary?.pendingAmount),
      sub: 'รอผู้เช่าชำระเงิน',
      icon: <MdPayment size={28} />,
      color: '#f59e0b'
    }
  ];

  // Group chart data
  const barChartData = {
    labels: [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ],
    datasets: [
      {
        label: 'รายรับรวม (บาท)',
        data: revenueData?.monthly?.map(m => m.totalRevenue) || Array(12).fill(0),
        backgroundColor: 'rgba(99, 102, 241, 0.65)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  };

  const donutChartData = {
    labels: ['ห้องว่าง', 'มีผู้เช่า', 'ปรับปรุง/ซ่อมบำรุง'],
    datasets: [
      {
        data: [
          summary?.availableRooms || 0,
          summary?.occupiedRooms || 0,
          summary?.maintenanceRooms || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.6)',
          'rgba(99, 102, 241, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ],
        borderColor: [
          '#10b981',
          '#6366f1',
          '#ef4444'
        ],
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Hide built-in legend since card title explains it
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 10 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 10 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Hide built-in legend since we have custom HTML legend below
      }
    }
  };

  return (
    <>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>ภาพรวมระบบจัดการหอพัก</h2>
        <p style={{ color: 'var(--text-secondary)' }}>สรุปข้อมูล สถิติ และบิลค่าเช่าล่าสุด</p>
      </div>

      {/* Grid Stats */}
      <div className="grid-cols-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="glass-card stat-card" style={{ position: 'relative' }}>
            <div className="stat-card-header">
              <span className="stat-card-title">{card.title}</span>
              <div
                className="stat-card-icon-wrap"
                style={{
                  color: card.color,
                  background: `rgba(${card.color === '#6366f1' ? '99,102,241' : card.color === '#8b5cf6' ? '139,92,246' : card.color === '#10b981' ? '16,185,129' : '245,158,11'}, 0.15)`
                }}
              >
                {card.icon}
              </div>
            </div>
            {idx === 1 && (
              <img
                src="/images/media_card.png"
                alt="Peeking panda"
                className="dashboard-card-panda"
              />
            )}
            <div>
              <h3 className="stat-card-value">{card.value}</h3>
              <p className="stat-card-sub">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Revenue Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', minWidth: 0 }}>
          <h3 style={{ fontSize: '1.15rem' }}>รายงานรายรับรายเดือน ปี {new Date().getFullYear() + 543}</h3>
          <div style={{ height: '300px', position: 'relative', width: '100%' }}>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        {/* Room Doughnut */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', minWidth: 0 }}>
          <h3 style={{ fontSize: '1.15rem' }}>อัตราการเข้าพัก</h3>
          <div style={{ height: '240px', position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Doughnut data={donutChartData} options={doughnutOptions} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 16px', fontSize: '0.85rem' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>● ว่าง: {summary?.availableRooms}</span>
            <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>● มีผู้เช่า: {summary?.occupiedRooms}</span>
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>● ซ่อม: {summary?.maintenanceRooms}</span>
          </div>
        </div>
      </div>

      {/* Unpaid Bills List */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem' }}>รายการค้างชำระด่วนล่าสุด</h3>
          <Link href="/billing" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            ดูข้อมูลบิลทั้งหมด
          </Link>
        </div>

        {/* Table layout for desktop */}
        <div className="custom-table-container desktop-only">
          <table className="custom-table">
            <thead>
              <tr>
                <th>เลขห้อง</th>
                <th>ผู้เช่า</th>
                <th>เดือน</th>
                <th>ยอดรวม</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {summary?.unpaidBills && summary.unpaidBills.length > 0 ? (
                summary.unpaidBills.map((bill) => (
                  <tr key={bill._id}>
                    <td style={{ fontWeight: 600 }}>{bill.room?.roomNumber || 'N/A'}</td>
                    <td>{bill.tenant ? `${bill.tenant.firstName} ${bill.tenant.lastName}` : 'ไม่มีข้อมูลผู้เช่า'}</td>
                    <td>{bill.billingMonth}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{formatTHB(bill.totalAmount)}</td>
                    <td>
                      <span className="badge badge-warning">ค้างชำระ</span>
                    </td>
                    <td>
                      <Link href={`/billing`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        บันทึกชำระเงิน
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    ไม่มีบิลค้างชำระในระบบขณะนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card layout for mobile */}
        <div className="mobile-only" style={{ gap: '12px' }}>
          {summary?.unpaidBills && summary.unpaidBills.length > 0 ? (
            summary.unpaidBills.map((bill) => (
              <div key={bill._id} className="mobile-card" style={{ padding: '16px', borderRadius: '12px' }}>
                <div className="mobile-card-header" style={{ paddingBottom: '8px' }}>
                  <span className="mobile-card-title">ห้อง {bill.room?.roomNumber || 'N/A'}</span>
                  <span className="badge badge-warning">ค้างชำระ</span>
                </div>
                <div className="mobile-card-body" style={{ gap: '6px' }}>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">ผู้เช่า:</span>
                    <span className="mobile-card-value">{bill.tenant ? `${bill.tenant.firstName} ${bill.tenant.lastName}` : 'ไม่มีข้อมูลผู้เช่า'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">ประจำเดือน:</span>
                    <span className="mobile-card-value">{bill.billingMonth}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">ยอดค้างชำระ:</span>
                    <span className="mobile-card-value" style={{ color: 'var(--color-warning)' }}>{formatTHB(bill.totalAmount)}</span>
                  </div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Link href={`/billing`} className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'block', textAlign: 'center' }}>
                    บันทึกชำระเงิน
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              ไม่มีบิลค้างชำระในระบบขณะนี้
            </div>
          )}
        </div>
      </div>
    </>
  );
}
