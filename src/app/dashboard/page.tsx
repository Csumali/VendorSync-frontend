'use client';


import { useState, useEffect } from 'react';
import { useAuth, useUser, SignIn } from '@clerk/nextjs';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KPICards from '@/components/KPICards';
import PaymentCalendar from '@/components/PaymentCalendar';
import Charts from '@/components/Charts';
import Alerts from '@/components/Alerts';
import VendorTable from '@/components/VendorTable';
import RenewalsTable from '@/components/RenewalsTable';
import { OptimizationMode, Vendor, Alert, Renewal, KPIs } from '@/types';
import { getVendors, getAlerts, getRenewals, getKPIs, getSavingsSeries, initializeDataService } from '@/data/dataService';
import styles from './dashboard.module.css';
// import { io } from 'socket.io-client';

export default function DashboardPage() {
  const { userId, sessionId, getToken } = useAuth()
  const { isLoaded, isSignedIn } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('Balanced');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // State for dashboard data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ totalVendors: 0, activeContracts: 0, upcomingPayments: 0, projectedSavings: 0, totalSpend: 0, averageInvoiceAmount: 0 });
  const [savingsSeries, setSavingsSeries] = useState<number[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load data when component mounts
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        
        // Initialize data service with getToken function
        await initializeDataService(getToken);
        
        // Load all dashboard data
        const [vendorsData, alertsData, renewalsData, kpisData, savingsData] = await Promise.all([
          getVendors(),
          getAlerts(),
          getRenewals(),
          getKPIs(),
          getSavingsSeries()
        ]);
        
        setVendors(vendorsData);
        setAlerts(alertsData);
        setRenewals(renewalsData);
        setKpis(kpisData);
        setSavingsSeries(savingsData);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setDataError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setDataLoading(false);
      }
    };

    if (isLoaded && isSignedIn) {
      loadDashboardData();
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Touch gesture support for mobile sidebar
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isSwipeStarted = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwipeStarted = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipeStarted) {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        
        // Check if it's a horizontal swipe from left edge
        if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50 && startX < 50) {
          isSwipeStarted = true;
          e.preventDefault();
          setIsMobileSidebarOpen(true);
        }
      }
    };

    const handleTouchEnd = () => {
      isSwipeStarted = false;
    };

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // const token = await getToken();
  // useEffect(() => {
    
  //   const socket = io("https://d0b310cdd31d.ngrok-free.app", {
  //     transports: ['websocket'],
  //     extraHeaders: {
  //       "Authorization": `Bearer ${token}`
  //     }
  //   }); // your NestJS gateway URL

  //   socket.on("connect", () => {
  //     console.log("Connected:", socket.id);
  //   });

  //   socket.on("overdue_payments", (data) => {
  //     console.log("Received overdue_payments:", data);
  //     // setMessages((prev) => [...prev, data]);
  //   });
  //   socket.on("message", (data) => {
  //     console.log(data)
  //   });

  //   socket.emit("message","Hello from client")

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, []);


  // Show loading state while Clerk is initializing or data is loading
  if (!isLoaded || dataLoading) {
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
          {!isLoaded ? 'Loading VendorSync...' : 'Loading dashboard data...'}
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

  // Show error state if data loading failed
  if (dataError) {
    return (
      <div className={styles.app}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: 'var(--text)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Error Loading Dashboard</h2>
          <p style={{ color: 'var(--subtext)', marginBottom: '2rem' }}>{dataError}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show dashboard for authenticated users
  return (
    <div className="min-h-dvh overflow-x-hidden">
        <div className={styles.app}>
          {/* Sidebar (desktop rail + mobile drawer) */}
          <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

          <Header 
            optimizationMode={optimizationMode}
            onModeChange={setOptimizationMode}
            onOpenSidebar={() => setMobileOpen(true)}
          />
          <main className={styles.main}>
            <KPICards kpis={kpis} />
            
            <section className={styles.twoColumn} style={{ marginTop: '14px' }}>
              <PaymentCalendar />
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
              <div>© VendorSync • Data loaded from API.</div>
              <div>Features: OCR contracts, payment optimization, price monitoring, compliance tracking.</div>
            </div>
          </main>
        </div>
      </div>
  );
}
