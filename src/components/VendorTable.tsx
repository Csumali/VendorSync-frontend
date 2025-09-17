'use client';

import { Vendor } from '@/types';
import styles from './VendorTable.module.css';

interface VendorTableProps {
  vendors: Vendor[];
}

export default function VendorTable({ vendors }: VendorTableProps) {
  const getComplianceClass = (compliance: string) => {
    if (compliance.includes('OK')) return 'ok';
    if (compliance.includes('Renew')) return 'warn';
    return 'bad';
  };

  const formatPriceDelta = (delta: number) => {
    const symbol = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
    return `${symbol} ${Math.abs(delta)}%`;
  };

  return (
    <div className={styles.card}>
      <h3>Vendor Performance</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Spend (MTD)</th>
            <th>Price Δ 30d</th>
            <th>On‑Time</th>
            <th>Compliance</th>
            <th>Next Payment</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor, index) => (
            <tr key={index}>
              <td><strong>{vendor.name}</strong></td>
              <td>${vendor.spend.toLocaleString()}</td>
              <td>{formatPriceDelta(vendor.priceDelta)}</td>
              <td>{vendor.onTime}%</td>
              <td>
                <span className={`${styles.pill} ${styles[getComplianceClass(vendor.compliance)]}`}>
                  {vendor.compliance}
                </span>
              </td>
              <td>{vendor.nextPay}</td>
              <td>
                <span className={styles.pill}>{vendor.score}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
