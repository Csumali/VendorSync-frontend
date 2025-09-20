'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { OptimizationMode } from '@/types';
import ScanContractModal from './ScanContractModal';
import styles from './Header.module.css';

interface HeaderProps {
  optimizationMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
}

export default function Header({ optimizationMode, onModeChange }: HeaderProps) {
  const { user, isLoaded } = useUser();
  const { isSignedIn, userId, sessionId, getToken } = useAuth()
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const modes: OptimizationMode[] = ['Balanced', 'Max Savings', 'Cash Heavy'];
  const currentIndex = modes.indexOf(optimizationMode);

  const handleModeClick = () => {
    const nextIndex = (currentIndex + 1) % modes.length;
    onModeChange(modes[nextIndex]);
  };

  const handleScanContract = () => {
    setIsScanModalOpen(true);
  };

  const handleScanConfirm = async (file: File) => {
    // Here you would typically send the file to your backend for processing
    console.log('Contract file selected:', file.name);
    const token = await getToken();
    // For now, we'll just show an alert
    alert(`Contract "${file.name}" has been uploaded and will be processed. This is a demo - in a real app, this would trigger OCR processing.`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`https://868697843cec.ngrok-free.app/vendor/invoice/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload contract error: ' + response.statusText);
      }
      
      const data = await response.json();
      console.log('Contract uploaded successfully:', data);
      alert('Contract uploaded successfully');
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Failed to upload contract. Please try again.');
    }
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
      <button 
        className={`${styles.btn} ${styles.primary}`}
        onClick={handleScanContract}
      >
        📷 Scan Contract
      </button>
      <div className={styles.btn} title="User">{getUserDisplayName()}</div>
      
      <ScanContractModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onConfirm={handleScanConfirm}
      />
    </header>
  );
}
