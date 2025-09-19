'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { SignIn } from '@clerk/nextjs';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KPICards from '@/components/KPICards';
import PaymentCalendar from '@/components/PaymentCalendar';
import Charts from '@/components/Charts';
import Alerts from '@/components/Alerts';
import VendorTable from '@/components/VendorTable';
import RenewalsTable from '@/components/RenewalsTable';
import { OptimizationMode } from '@/types';
import { vendors, alerts, renewals, kpis, calendarEvents, savingsSeries } from '@/data/mockData';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('Balanced');


  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className={styles.app}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: 'var(--text)'
        }}>
          Loading VendorSync...
        </div>
      </div>
    );
  }

  // Show sign-in page if user is not authenticated
  if (!isSignedIn) {
    return (
      <main className="min-h-dvh grid place-items-center p-6" style={{ background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Welcome to VendorSync</h1>
          <p style={{ color: 'var(--subtext)' }}>Please sign in to access your dashboard</p>
        </div>
        <SignIn appearance={{ layout: { socialButtonsPlacement: "bottom" } }} />
      </main>
    );
  }

  // Show dashboard for authenticated users
  return (
    <div className={styles.app}>
      <Sidebar />
      <Header 
        optimizationMode={optimizationMode}
        onModeChange={setOptimizationMode}
      />
      <main className={styles.main}>
        <KPICards kpis={kpis} />
        
        <section className={styles.twoColumn} style={{ marginTop: '14px' }}>
          <PaymentCalendar events={calendarEvents} />
          <Charts 
            vendors={vendors}
            savingsSeries={savingsSeries}
            optimizationMode={optimizationMode}
          />
        </section>

        <section className={styles.threeColumn} style={{ marginTop: '14px' }}>
          <Alerts alerts={alerts} />
          <VendorTable vendors={vendors} />
          <RenewalsTable renewals={renewals} />
        </section>

        <div className={styles.footer}>
          <div>© VendorSync Demo • All data is mock.</div>
          <div>Inspired by features: OCR contracts, payment optimization, price monitoring, compliance tracking.</div>
        </div>
      </main>
    </div>
  );
}
