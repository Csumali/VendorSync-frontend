'use client';

import styles from './Sidebar.module.css';

const navigationItems = [
  { icon: '📊', label: 'Dashboard', active: true },
  { icon: '🤝', label: 'Vendors', active: false },
  { icon: '📄', label: 'Contracts', active: false },
  { icon: '💸', label: 'Payments', active: false },
  { icon: '🔔', label: 'Alerts', active: false },
  { icon: '🛡️', label: 'Compliance', active: false },
  { icon: '📈', label: 'Analytics', active: false },
  { icon: '⚙️', label: 'Settings', active: false },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>VS</div>
        <div>
          <h1>VendorSync</h1>
          <small>Contract & Vendor Intelligence</small>
        </div>
      </div>
      <nav className={styles.nav}>
        {navigationItems.map((item) => (
          <a 
            key={item.label}
            href="#" 
            className={`${styles.navItem} ${item.active ? styles.active : ''}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className={styles.note}>
        Demo with fake data for presentation. Scan contracts, track terms, price changes, compliance, and optimize payment timing.
      </div>
    </aside>
  );
}
