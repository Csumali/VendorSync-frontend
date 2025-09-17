'use client';

import { Renewal } from '@/types';
import styles from './RenewalsTable.module.css';

interface RenewalsTableProps {
  renewals: Renewal[];
}

export default function RenewalsTable({ renewals }: RenewalsTableProps) {
  const getStatusClass = (status: string) => {
    if (status.includes('Auto')) return 'ok';
    if (status.includes('Negotiation')) return 'warn';
    return 'bad';
  };

  return (
    <div className={styles.card}>
      <h3>Renewals & Compliance</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Vendor</th>
            <th>Renews</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {renewals.map((renewal, index) => (
            <tr key={index}>
              <td>{renewal.contract}</td>
              <td>{renewal.vendor}</td>
              <td>{renewal.renews}</td>
              <td>
                <span className={`${styles.pill} ${styles[getStatusClass(renewal.status)]}`}>
                  {renewal.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
