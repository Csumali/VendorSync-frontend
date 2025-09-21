'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import ScanContractModal from './ScanContractModal';

export type OptimizationMode = 'Balanced' | 'Max Savings' | 'Cash Heavy';

interface HeaderProps {
  optimizationMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  onOpenSidebar: () => void;
}

export default function Header({ optimizationMode, onModeChange, onOpenSidebar }: HeaderProps) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const modes: OptimizationMode[] = ['Balanced', 'Max Savings', 'Cash Heavy'];
  const currentIndex = modes.indexOf(optimizationMode);

  const handleModeClick = () => {
    const nextIndex = (currentIndex + 1) % modes.length;
    onModeChange(modes[nextIndex]);
  };

  const handleScanConfirm = async (file: File) => {
    console.log('Contract file selected:', file.name);
    const token = await getToken();
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`https://abbff5cd7d1b.ngrok-free.app/vendor/invoice/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload contract error: ' + response.statusText);
      }
      
      const data = await response.json();
      console.log('Contract uploaded successfully:', data);
      
      // Store the response data and show confirmation modal
      setUploadResponse(data);
      setIsConfirmModalOpen(true);
      
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Failed to upload contract. Please try again.');
    }
  };

  const handleDataConfirmation = (isCorrect: boolean) => {
    setIsConfirmModalOpen(false);
    if (isCorrect) {
      alert('✅ Contract data confirmed and saved!');
      // Here you would typically save the data to your state/backend
    } else {
      alert('❌ Contract data rejected. Please try uploading again.');
    }
    setUploadResponse(null);
  };

  const displayName = !isLoaded
    ? 'Loading…'
    : user
    ? user.fullName || user.username || user.emailAddresses[0]?.emailAddress || 'User'
    : 'Guest';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(10,16,23,0.55)] px-4 py-2 backdrop-blur">
      {/* Wraps on small screens */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Row 1: hamburger + search */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--chip)] text-lg md:hidden"
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
            <input
              placeholder="Search vendors, contracts, terms…"
              className="h-[42px] w-full rounded-xl border border-[var(--border)] bg-[var(--card-2)] pl-9 pr-3 text-[var(--text)] outline-none"
            />
          </div>
        </div>

        {/* Row 2: action buttons */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            onClick={handleModeClick}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm transition hover:brightness-110"
          >
            ⚙️ <span className="hidden sm:inline">Optimization:</span>
            <strong className="ml-1">{optimizationMode}</strong>
          </button>

          <button
            onClick={() => setIsScanModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-[#184ba8] bg-[linear-gradient(180deg,#1f6fff,#125bdb)] px-3 py-2 text-sm transition hover:brightness-110"
          >
            📷 <span className="hidden sm:inline">Scan Contract</span>
          </button>

          <div className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm">
            👤 <span className="max-w-[12rem] truncate">{displayName}</span>
          </div>
        </div>
      </div>
      <ScanContractModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onConfirm={handleScanConfirm}
        uploadResponse={uploadResponse}
        isConfirmModalOpen={isConfirmModalOpen}
        onDataConfirmation={handleDataConfirmation}
      />
    </header>
  );
}
