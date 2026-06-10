'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { api } from '@/lib/api';
import './globals.css';

export default function RootLayout({ children }) {
  const [dormitoryName, setDormitoryName] = useState('StayBill');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('staybill-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('staybill-theme', newTheme);
  };

  useEffect(() => {
    // Fetch settings to get the dynamic dormitory name
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res.success && res.data) {
          setDormitoryName(res.data.dormitoryName);
        }
      } catch (err) {
        console.error('Failed to load dormitory settings in root layout', err);
      }
    };
    fetchSettings();

    window.addEventListener('settingsUpdated', fetchSettings);
    return () => {
      window.removeEventListener('settingsUpdated', fetchSettings);
    };
  }, []);

  const pathname = usePathname();
  const isSharePage = pathname && pathname.startsWith('/share');

  if (isSharePage) {
    return (
      <html lang="th" data-theme={theme}>
        <head>
          <title>StayBill — ใบแจ้งหนี้ค่าเช่า</title>
          <meta name="description" content="ดูรายละเอียดใบแจ้งหนี้ค่าเช่าหอพักของคุณ" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body style={{ background: 'var(--bg-primary)', margin: 0, padding: 0 }}>
          <main style={{ minHeight: '100vh' }}>
            {children}
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="th" data-theme={theme}>
      <head>
        <title>StayBill — ระบบจัดการหอพักอัจฉริยะ</title>
        <meta name="description" content="ระบบจัดการหอพักอัจฉริยะ จัดการผู้เช่า ห้องพัก คำนวณบิลรายเดือน และสถิติครบวงจร" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="app-container">
          <Sidebar dormitoryName={dormitoryName} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
          
          {sidebarOpen && (
            <div 
              className="sidebar-backdrop" 
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <div className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header 
              dormitoryName={dormitoryName} 
              toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
              theme={theme}
              toggleTheme={toggleTheme}
            />
            
            {/* Margins/Padding to account for fixed Header & Sidebar */}
            <main className="main-content" style={{ marginTop: 'var(--header-height)' }}>
              {children}
            </main>
          </div>

          {/* Bottom navigation bar visible on mobile */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
