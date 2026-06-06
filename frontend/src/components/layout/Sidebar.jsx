import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MdDashboard, 
  MdMeetingRoom, 
  MdPeople, 
  MdReceipt, 
  MdInsertChart, 
  MdSettings 
} from 'react-icons/md';
import styles from './Layout.module.css';

export default function Sidebar({ dormitoryName = 'StayBill', isOpen, setIsOpen }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <MdDashboard size={22} /> },
    { name: 'จัดการห้องพัก', path: '/rooms', icon: <MdMeetingRoom size={22} /> },
    { name: 'จัดการผู้เช่า', path: '/tenants', icon: <MdPeople size={22} /> },
    { name: 'คำนวณบิลรายเดือน', path: '/billing', icon: <MdReceipt size={22} /> },
    { name: 'รายงานรายรับ', path: '/reports', icon: <MdInsertChart size={22} /> },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>SB</div>
        <span className={`${styles.logoText} text-gradient`}>{dormitoryName}</span>
      </div>

      <nav className={styles.navigation}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              onClick={() => setIsOpen && setIsOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.version}>StayBill v1.0.0</div>
        <div className={styles.developer}>Dormitory Management</div>
      </div>
    </aside>
  );
}
