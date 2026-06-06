import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MdDashboard, 
  MdMeetingRoom, 
  MdPeople, 
  MdInsertChart, 
  MdReceipt 
} from 'react-icons/md';
import styles from './Layout.module.css';

export default function BottomNav() {
  const pathname = usePathname();

  const allItems = [
    { name: 'หน้าหลัก', path: '/', icon: <MdDashboard size={20} /> },
    { name: 'ห้องพัก', path: '/rooms', icon: <MdMeetingRoom size={20} /> },
    { name: 'ผู้เช่า', path: '/tenants', icon: <MdPeople size={20} /> },
    { name: 'รายงาน', path: '/reports', icon: <MdInsertChart size={20} /> },
    { name: 'คำนวณบิล', path: '/billing', icon: <MdReceipt size={24} />, isFab: true },
  ];

  // Calculate the active index to position the sliding line (each tab is 20% width)
  const activeIndex = allItems.findIndex(item => item.path === pathname);

  return (
    <div className={styles.bottomNav}>
      {/* Sliding indicator line at the top of the bar - hides smoothly on activeIndex 4 (Billing FAB) */}
      <div 
        className={`${styles.bottomNavIndicator} ${activeIndex === 4 || activeIndex === -1 ? styles.indicatorHidden : ''}`} 
        style={{ 
          left: `${activeIndex !== -1 ? activeIndex * 20 : 0}%` 
        }}
      >
        <img 
          key={activeIndex}
          src="/images/media.png" 
          alt="Panda peeking" 
          className={styles.bottomNavPanda}
        />
      </div>

      {allItems.map((item) => {
        const isActive = pathname === item.path;
        
        if (item.isFab) {
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.bottomNavLink} ${styles.bottomNavFabWrapper} ${isActive ? styles.bottomNavFabActive : ''}`}
            >
              <div className={styles.bottomNavFab}>
                {item.icon}
              </div>
              <span className={styles.bottomNavLabel}>{item.name}</span>
            </Link>
          );
        }

        return (
          <Link 
            key={item.path} 
            href={item.path}
            className={`${styles.bottomNavLink} ${isActive ? styles.bottomNavActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
