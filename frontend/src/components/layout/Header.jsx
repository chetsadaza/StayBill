import { useEffect, useState, useRef } from 'react';
import { 
  MdToday, 
  MdMenu, 
  MdDarkMode, 
  MdLightMode, 
  MdKeyboardArrowDown, 
  MdSettings, 
  MdExitToApp 
} from 'react-icons/md';
import Link from 'next/link';
import Toast from '@/components/ui/Toast';
import styles from './Layout.module.css';

export default function Header({ dormitoryName = 'หอพัก StayBill', toggleSidebar, theme, toggleTheme, user, onLogout }) {
  const [currentDate, setCurrentDate] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const dropdownRef = useRef(null);

  // Derive display info from user prop
  const displayName = user?.name || 'ผู้ใช้ระบบ';
  const displayEmail = user?.email || '';
  const displayInitial = displayName.charAt(0);
  const displayRole = user?.role === 'admin' ? 'admin' : 'member';

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const formatted = new Date().toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setCurrentDate(formatted);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      setToast({ show: true, message: 'ออกจากระบบสำเร็จ', type: 'success' });
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.menuToggleBtn} onClick={toggleSidebar} aria-label="เปิดเมนู">
            <MdMenu size={24} />
          </button>
          <h1 className={styles.welcomeTitle}>ระบบจัดการ{dormitoryName}</h1>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.dateDisplay}>
            <MdToday size={18} className={styles.dateIcon} />
            <span>{currentDate}</span>
          </div>

          <div className={styles.divider}></div>
          
          {/* Theme Toggle */}
          <button 
            className={styles.themeToggle} 
            onClick={toggleTheme} 
            aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดกลางวัน' : 'เปลี่ยนเป็นโหมดกลางคืน'}
            data-active={theme}
          >
            <div className={styles.themeToggleTrack}>
              <span className={`${styles.themeIcon} ${styles.iconMoon}`}>
                <MdDarkMode />
              </span>
              <span className={`${styles.themeIcon} ${styles.iconSun}`}>
                <MdLightMode />
              </span>
              <div className={`${styles.themeToggleThumb} ${theme === 'light' ? styles.themeToggleThumbLight : ''}`} />
            </div>
          </button>

          <div className={styles.divider}></div>
          
          {/* Profile Dropdown Container */}
          <div className={styles.profileContainer} ref={dropdownRef}>
            <div onClick={toggleDropdown} className={styles.profileArea}>
              <div className={styles.profileAvatar}>{displayInitial}</div>
              <div className={styles.profileInfoRow}>
                <span className={styles.profileName}>{displayName}</span>
                <span className={styles.profileRoleInline}>{displayRole}</span>
                <MdKeyboardArrowDown size={18} style={{ 
                  color: 'var(--text-secondary)',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform var(--transition-fast) ease'
                }} />
              </div>
            </div>

            {isDropdownOpen && (
              <div className={styles.profileDropdown}>
                {/* Dropdown Header */}
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatarLarge}>{displayInitial}</div>
                  <div className={styles.dropdownInfoLarge}>
                    <span className={styles.dropdownNameLarge}>{displayName}</span>
                    <span className={styles.dropdownEmailLarge}>{displayEmail}</span>
                  </div>
                </div>

                <hr className={styles.dropdownDivider} />

                {/* Dropdown Menu List */}
                <div className={styles.dropdownMenu}>
                  <Link href="/settings" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    <MdSettings size={20} className={styles.dropdownItemIcon} />
                    <span>ตั้งค่า</span>
                  </Link>
                </div>

                <hr className={styles.dropdownDivider} />

                {/* Dropdown Logout */}
                <a href="#" className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`} onClick={handleLogout}>
                  <MdExitToApp size={20} className={styles.dropdownItemIcon} />
                  <span>ออกจากระบบ</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Custom Toast Alert */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}
    </>
  );
}
