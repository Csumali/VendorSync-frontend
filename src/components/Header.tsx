'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { OptimizationMode } from '@/types';
import styles from './Header.module.css';

interface HeaderProps {
  optimizationMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
}

export default function Header({ optimizationMode, onModeChange }: HeaderProps) {
  const { user, isLoaded } = useUser();
  const modes: OptimizationMode[] = ['Balanced', 'Max Savings', 'Cash Heavy'];
  const currentIndex = modes.indexOf(optimizationMode);

  const handleModeClick = () => {
    const nextIndex = (currentIndex + 1) % modes.length;
    onModeChange(modes[nextIndex]);
  };

  const getUserDisplayName = () => {
    if (!isLoaded) return '👤 Loading...';
    if (!user) return '👤 Guest';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || user.username || user.emailAddresses[0]?.emailAddress || 'User';
    
    return `👤 ${displayName}`;
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.search}>
        <span className={styles.icon}>🔎</span>
        <input placeholder="Search vendors, contracts, terms (e.g., 'Net 30', '2/10')" />
      </div>
      <button className={styles.btn} onClick={handleModeClick}>
        ⚙️ Optimization: <strong style={{ marginLeft: '6px' }}>{optimizationMode}</strong>
      </button>
      <button className={`${styles.btn} ${styles.primary}`}>📷 Scan Contract</button>
      <div className={styles.btn} title="User">{getUserDisplayName()}</div>
    </header>
  );
}
