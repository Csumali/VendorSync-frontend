'use client';

import { KPIs } from '@/types';
import styles from './KPICards.module.css';

interface KPICardsProps {
  kpis: KPIs;
  totalSpend?: number; // Optional prop to override totalSpend from KPIs
}

export default function KPICards({ kpis, totalSpend }: KPICardsProps) {
  const displayValue = totalSpend ?? kpis.totalSpend;
  
  return (
    <section className={styles.kpis}>
      <div className={styles.card}>
        <h3>Total Vendors</h3>
        <div className={styles.metric}>{kpis.totalVendors}</div>
        <div className={styles.delta}>Connected across all categories</div>
      </div>
      <div className={styles.card}>
        <h3>Active Contracts</h3>
        <div className={styles.metric}>{kpis.activeContracts}</div>
        <div className={styles.delta}>Connected across all invoices</div>
      </div>
      <div className={styles.card}>
        <h3>Upcoming Payments (30d)</h3>
        <div className={styles.metric}>{kpis.upcomingPayments}</div>
        <div className={styles.delta}>Within 30 days</div>
      </div>
      <div className={styles.card}>
        <h3>Projected Savings (12 mo)</h3>
        <div className={styles.metric}>${kpis.projectedSavings === 0 ? '0' : kpis.projectedSavings.toLocaleString()}</div>
        <div className={`${styles.delta} ${styles.up}`}>via early-pay & price monitoring</div>
      </div>
      <div className={styles.card}>
        <h3>Total Spend</h3>
        <div className={styles.metric}>${displayValue === 0 ? '0' : displayValue.toLocaleString()}</div>
        <div className={styles.delta}>Across all vendors</div>
      </div>
      <div className={styles.card}>
        <h3>Avg Invoice</h3>
        <div className={styles.metric}>${kpis.averageInvoiceAmount === 0 ? '0' : kpis.averageInvoiceAmount.toLocaleString()}</div>
        <div className={styles.delta}>Per transaction</div>
      </div>
    </section>
  );
}
