'use client';

import { useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
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
  const { user } = useUser();

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
      {user && (
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.fullName || 'User'} 
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarInitials}>
                  {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress?.[0] || 'U'}
                </span>
              )}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {user.fullName || user.username || user.emailAddresses[0]?.emailAddress}
              </div>
              <div className={styles.userEmail}>
                {user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>
          <SignOutButton>
            <button className={styles.signOutBtn}>
              🚪 Sign Out
            </button>
          </SignOutButton>
        </div>
      )}
    </aside>
  );
}
