'use client';

import { Alert } from '@/types';
import styles from './Alerts.module.css';

interface AlertsProps {
  alerts: Alert[];
}

export default function Alerts({ alerts }: AlertsProps) {
  return (
    <div className={styles.card}>
      <h3>Alert Center</h3>
      <div className={styles.alerts}>
        {alerts.map((alert, index) => (
          <div key={index} className={styles.alert}>
            <div className={styles.msg}>
              <span className={`${styles.dot} ${styles[alert.level]}`}></span>
              <div>{alert.text}</div>
            </div>
            <div>
              <button className={styles.btn}>Snooze</button>
              <button className={styles.btn}>Resolve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
