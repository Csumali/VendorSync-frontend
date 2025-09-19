'use client';

import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types';
import { getCalendarEvents } from '@/data/dataService';
import styles from './PaymentCalendar.module.css';

interface PaymentCalendarProps {
  events?: CalendarEvent[]; // Make optional since we'll load events dynamically
}

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
  currentYear: number;
  currentMonth: number;
}

function DatePicker({ isOpen, onClose, onSelect, currentYear, currentMonth }: DatePickerProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSelect = () => {
    onSelect(selectedYear, selectedMonth);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.datePicker} onClick={(e) => e.stopPropagation()}>
        <div className={styles.datePickerHeader}>
          <h4>Select Month & Year</h4>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.datePickerContent}>
          <div className={styles.yearSelector}>
            <label>Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={styles.select}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.monthSelector}>
            <label>Month:</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className={styles.select}
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className={styles.datePickerActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.selectBtn} onClick={handleSelect}>Select</button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCalendar({ events: propEvents }: PaymentCalendarProps) {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(now);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(propEvents || []);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // make Monday=0
  const totalCells = startWeekday + lastDay.getDate();
  const monthTitle = currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // Check if today is in the current month
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  // Load calendar events for the current month/year
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        const events = await getCalendarEvents(year, month);
        setCalendarEvents(events);
      } catch (error) {
        console.error('Error loading calendar events:', error);
        setCalendarEvents(propEvents || []);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, [year, month, propEvents]);

  const getEventForDay = (day: number) => {
    return calendarEvents.find(event => event.day === day);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateSelect = (selectedYear: number, selectedMonth: number) => {
    setCurrentDate(new Date(selectedYear, selectedMonth, 1));
  };

  const isToday = (day: number) => {
    return isCurrentMonth && day === todayDate;
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.calHead}>
        <h3>Payment Calendar</h3>
        <div>
          <button className={styles.btn} onClick={goToPreviousMonth}>◀</button>
          <strong 
            className={styles.monthTitle}
            onClick={() => setShowDatePicker(true)}
            style={{ margin: '0 8px', cursor: 'pointer' }}
          >
            {monthTitle}
          </strong>
          <button className={styles.btn} onClick={goToNextMonth}>▶</button>
        </div>
      </div>
      <div className={styles.calGrid}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startWeekday + 1;
          const event = getEventForDay(dayNum);
          const isCurrentDay = isToday(dayNum);
          
          return (
            <div 
              key={i} 
              className={`${styles.calCell} ${isCurrentDay ? styles.today : ''}`}
            >
              {i >= startWeekday && (
                <>
                  <div className={`${styles.day} ${isCurrentDay ? styles.todayDay : ''}`}>
                    {dayNum}
                  </div>
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
      
      <DatePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateSelect}
        currentYear={year}
        currentMonth={month}
      />
    </div>
  );
}
