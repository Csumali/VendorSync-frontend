'use client';

import { useState } from 'react';
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
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('Balanced');

  const handleExport = () => {
    window.print();
  };

  return (
    <div className={styles.app}>
      <Sidebar />
      <Header 
        optimizationMode={optimizationMode}
        onModeChange={setOptimizationMode}
        onExport={handleExport}
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
