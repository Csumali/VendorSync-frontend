'use client';

import { useState } from 'react';
import { OptimizationMode } from '@/types';
import styles from './Header.module.css';

interface HeaderProps {
  optimizationMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  onExport: () => void;
}

export default function Header({ optimizationMode, onModeChange, onExport }: HeaderProps) {
  const modes: OptimizationMode[] = ['Balanced', 'Max Savings', 'Cash Heavy'];
  const currentIndex = modes.indexOf(optimizationMode);

  const handleModeClick = () => {
    const nextIndex = (currentIndex + 1) % modes.length;
    onModeChange(modes[nextIndex]);
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
      <button className={styles.btn}>📷 Scan Contract</button>
      <button className={`${styles.btn} ${styles.primary}`} onClick={onExport}>
        ⬇️ Export
      </button>
      <div className={styles.btn} title="User">👤 Alex (Owner)</div>
    </header>
  );
}
