'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { api } from '@/lib/api';
import './globals.css';

export default function RootLayout({ children }) {
  const [dormitoryName, setDormitoryName] = useState('StayBill');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const isSharePage = pathname && pathname.startsWith('/share');
  const isLoginPage = pathname && pathname === '/login';
  const isPublicPage = isSharePage || isLoginPage;

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

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('staybill-token');

      if (!token) {
        setAuthChecked(true);
        if (!isPublicPage) {
          router.replace('/login');
        }
        return;
      }

      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          localStorage.removeItem('staybill-token');
          if (!isPublicPage) {
            router.replace('/login');
          }
        }
      } catch (err) {
        console.error('Auth check failed', err);
        localStorage.removeItem('staybill-token');
        if (!isPublicPage) {
          router.replace('/login');
        }
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [pathname]);

  // Fetch dormitory name for sidebar/header
  useEffect(() => {
    if (!user) return; // Only fetch after login
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
  }, [user]);

  // Logout handler
  const handleLogout = useCallback(() => {
    localStorage.removeItem('staybill-token');
    setUser(null);
    router.replace('/login');
  }, [router]);

  // Share page: standalone layout
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

  // Login page: standalone layout (no sidebar/header)
  if (isLoginPage) {
    return (
      <html lang="th" data-theme={theme}>
        <head>
          <title>StayBill — เข้าสู่ระบบ</title>
          <meta name="description" content="เข้าสู่ระบบจัดการหอพักอัจฉริยะ StayBill" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body style={{ background: 'var(--bg-primary)', margin: 0, padding: 0 }}>
          {children}
        </body>
      </html>
    );
  }

  // Protected pages: show loading while checking auth
  if (!authChecked) {
    return (
      <html lang="th" data-theme={theme}>
        <head>
          <title>StayBill — ระบบจัดการหอพักอัจฉริยะ</title>
          <meta name="description" content="ระบบจัดการหอพักอัจฉริยะ จัดการผู้เช่า ห้องพัก คำนวณบิลรายเดือน และสถิติครบวงจร" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh', 
            background: 'var(--bg-primary)',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
          </div>
        </body>
      </html>
    );
  }

  // If not authenticated after check, don't render dashboard (redirect will happen)
  if (!user) {
    return (
      <html lang="th" data-theme={theme}>
        <head>
          <title>StayBill — ระบบจัดการหอพักอัจฉริยะ</title>
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh', 
            background: 'var(--bg-primary)',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังเปลี่ยนเส้นทาง...</p>
          </div>
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
              user={user}
              onLogout={handleLogout}
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
