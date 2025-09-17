'use client';

import { CalendarEvent } from '@/types';
import styles from './PaymentCalendar.module.css';

interface PaymentCalendarProps {
  events: CalendarEvent[];
}

export default function PaymentCalendar({ events }: PaymentCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // make Monday=0
  const totalCells = startWeekday + lastDay.getDate();
  const monthTitle = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const getEventForDay = (day: number) => {
    return events.find(event => event.day === day);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.calHead}>
        <h3>Payment Calendar</h3>
        <div>
          <button className={styles.btn}>◀</button>
          <strong style={{ margin: '0 8px' }}>{monthTitle}</strong>
          <button className={styles.btn}>▶</button>
        </div>
      </div>
      <div className={styles.calGrid}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startWeekday + 1;
          const event = getEventForDay(dayNum);
          
          return (
            <div key={i} className={styles.calCell}>
              {i >= startWeekday && (
                <>
                  <div className={styles.day}>{dayNum}</div>
                  {event && (
                    <div className={`${styles.badge} ${styles[event.type]}`}>
                      {event.label}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
