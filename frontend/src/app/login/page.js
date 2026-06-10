'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdMail, MdLock, MdVisibility, MdVisibilityOff, MdDarkMode, MdLightMode } from 'react-icons/md';
import { api } from '@/lib/api';
import Toast from '@/components/ui/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const [theme, setTheme] = useState('dark');
  const router = useRouter();

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('staybill-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // If already logged in, redirect
    const token = localStorage.getItem('staybill-token');
    if (token) {
      router.replace('/');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('staybill-theme', newTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setToast({ show: true, message: 'กรุณาระบุอีเมลและรหัสผ่าน', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.data?.token) {
        localStorage.setItem('staybill-token', res.data.token);
        router.replace('/');
      }
    } catch (err) {
      setToast({ show: true, message: err.message || 'เข้าสู่ระบบไม่สำเร็จ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>


      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggleTheme}
        aria-label="สลับธีม"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '10px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
          backdropFilter: 'blur(12px)',
          zIndex: 10
        }}
      >
        {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
      </button>

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--glass-shadow)',
        padding: '48px 40px',
        position: 'relative',
        zIndex: 1,
        animation: 'loginFadeIn 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards'
      }}>
        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: 'var(--accent-glow)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'white',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '-1px'
          }}>
            SB
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            StayBill
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            เข้าสู่ระบบจัดการหอพักอัจฉริยะ
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)'
            }}>
              อีเมล
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <MdMail size={18} />
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 42px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'var(--transition-fast)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)'
            }}>
              รหัสผ่าน
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <MdLock size={18} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 42px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'var(--transition-fast)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'var(--transition-fast)'
                }}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'var(--text-muted)' : 'var(--accent-gradient)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-fast)',
              boxShadow: loading ? 'none' : 'var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  animation: 'spin 0.6s linear infinite'
                }} />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginTop: '32px',
          lineHeight: 1.5
        }}>
          StayBill v1.0.0 — ระบบจัดการหอพักอัจฉริยะ
        </p>
      </div>

      {/* Inline styles for background and animations */}
      <style jsx global>{`
        .login-bg-container {
          background-image: url('/images/%E0%B8%9B%E0%B8%81login%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%96%E0%B8%B7%E0%B8%AD.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: background-image 0.5s ease;
        }
        @media (min-width: 768px) {
          .login-bg-container {
            background-image: url('/images/%E0%B8%9B%E0%B8%81login%E0%B8%84%E0%B8%AD%E0%B8%A1.jpg');
          }
        }
        .login-bg-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.05); /* Very subtle dark overlay */
          z-index: 0;
          pointer-events: none;
          transition: background 0.3s ease;
        }
        [data-theme="light"] .login-bg-container::before {
          background: rgba(255, 255, 255, 0.05); /* Very subtle light overlay */
        }
        @keyframes loginFadeIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Toast */}
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
