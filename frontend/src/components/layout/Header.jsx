import { useEffect, useState } from 'react';
import { MdToday, MdMenu, MdDarkMode, MdLightMode } from 'react-icons/md';
import styles from './Layout.module.css';

export default function Header({ dormitoryName = 'หอพัก StayBill', toggleSidebar, theme, toggleTheme }) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const formatted = new Date().toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setCurrentDate(formatted);
  }, []);

  return (
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
        
        <div className={styles.profileArea}>
          <div className={styles.profileAvatar}>A</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>ผู้ดูแลระบบ</span>
            <span className={styles.profileRole}>Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
