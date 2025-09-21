'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CalendarEvent } from '@/types';
import styles from './PaymentCalendar.module.css';

interface PaymentCalendarProps {
  events?: CalendarEvent[]; // Make optional since we'll load events dynamically
}

type Vendor = {
  id: string;
  name: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: { id: string };
};

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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(now);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(propEvents || []);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  
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

  // Load vendors directly from API (like vendors page does)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const upstream = process.env.NEXT_PUBLIC_API_BASE + '/vendor';

        if (!upstream) {
          throw new Error('Vendors API URL is not defined.');
        }

        const res = await fetch(upstream, {
          method: 'GET',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Fetch failed (${res.status}) ${text ? `- ${text}` : ''}`.trim());
        }

        const data = await res.json();
        if (cancelled) return;

        const vendorList: Vendor[] = Array.isArray(data) ? data : data?.vendors ?? [];
        console.log('PaymentCalendar: Fetched vendors:', vendorList);
        setVendors(vendorList);
      } catch (e: any) {
        console.error('Error loading vendors:', e?.message ?? 'Failed to load vendors.');
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  // Load invoices directly from API
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const upstream = process.env.NEXT_PUBLIC_API_BASE + '/vendor/invoice/all';

        if (!upstream) {
          throw new Error('Invoices API URL is not defined.');
        }

        const res = await fetch(upstream, {
          method: 'GET',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Fetch failed (${res.status}) ${text ? `- ${text}` : ''}`.trim());
        }

        const data = await res.json();
        if (cancelled) return;

        const invoiceList = Array.isArray(data) ? data : data?.invoices ?? [];
        console.log('PaymentCalendar: Fetched invoices:', invoiceList);
        setInvoices(invoiceList);
        
        // Hydrate vendor names from invoice vendor IDs
        const vendorIds = Array.from(new Set(invoiceList.map((inv: any) => inv.vendorId || inv.vendor?.id).filter(Boolean))) as string[];
        if (vendorIds.length > 0) {
          hydrateVendorNames(vendorIds);
        }
      } catch (e: any) {
        console.error('Error loading invoices:', e?.message ?? 'Failed to load invoices.');
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  // Hydrate vendor names from vendor IDs found in invoices
  const hydrateVendorNames = async (vendorIds: string[]) => {
    const token = await getToken();
    const headers = {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const pairs = await Promise.all(vendorIds.map(async id => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/vendor/${id}`, { 
          headers, 
          cache: 'no-store' 
        });
        if (!res.ok) return [id, null] as const;
        const vendor = await res.json();
        return [id, (vendor?.name ?? '').toString().trim() || null] as const;
      } catch { 
        return [id, null] as const; 
      }
    }));

    const map: Record<string, string> = {};
    pairs.forEach(([id, name]) => { 
      if (name) map[id] = name; 
    });
    
    if (Object.keys(map).length) {
      setVendorNames(prev => ({ ...prev, ...map }));
    }
  };

  // Generate calendar events from vendors and invoices data
  useEffect(() => {
    console.log('PaymentCalendar: Generating events - vendors:', vendors.length, 'invoices:', invoices.length);
    
    if (vendors.length === 0 || invoices.length === 0) {
      console.log('PaymentCalendar: Not enough data, using prop events');
      setCalendarEvents(propEvents || []);
      return;
    }

    const events: CalendarEvent[] = [];
    
    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const invoiceYear = dueDate.getFullYear();
      const invoiceMonth = dueDate.getMonth();
      const day = dueDate.getDate();
      
      // Filter by year and month if provided
      if (invoiceYear !== year || invoiceMonth !== month) {
        return;
      }
      
      // Find vendor name - try multiple sources
      const vendorId = invoice.vendorId || invoice.vendor?.id;
      let vendorName = `Vendor ${vendorId}`;
      
      // First try hydrated vendor names
      if (vendorNames[vendorId]) {
        vendorName = vendorNames[vendorId];
      } else {
        // Fallback to vendors array
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor?.name) {
          vendorName = vendor.name;
        }
      }
      
      console.log(`PaymentCalendar: Invoice ${invoice.invoiceNumber} - vendorId: ${vendorId}, vendorName: ${vendorName}`);
      
      // Determine event type based on payment terms and dates
      let type: 'soon' | 'due' | 'save' | 'future' = 'due';
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (invoice.earlyPayDiscount && invoice.earlyPayDiscount > 0) {
        type = 'save';
      } else if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        type = 'soon';
      } else if (daysUntilDue > 7) {
        type = 'future';
      } else {
        // daysUntilDue < 0 (overdue)
        type = 'due';
      }
      
      // Create event label (truncate vendor name if too long)
      const label = vendorName.length > 8 ? vendorName.substring(0, 8) + '...' : vendorName;
      
      events.push({
        day,
        label,
        type,
        vendorId: invoice.vendorId,
        fullVendorName: vendorName
      });
    });
    
    // Remove duplicates and sort by day
    const uniqueEvents = events.reduce((acc, event) => {
      const existing = acc.find(e => e.day === event.day);
      if (!existing) {
        acc.push(event);
      } else {
        // If multiple events on same day, combine labels and vendor names
        existing.label = existing.label + ', ' + event.label;
        if (existing.fullVendorName && event.fullVendorName) {
          existing.fullVendorName = existing.fullVendorName + ', ' + event.fullVendorName;
        }
      }
      return acc;
    }, [] as CalendarEvent[]);
    
    const finalEvents = uniqueEvents.sort((a, b) => a.day - b.day);
    console.log('PaymentCalendar: Generated events:', finalEvents);
    setCalendarEvents(finalEvents);
  }, [year, month, vendors, invoices, vendorNames, propEvents]);

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

  // Check if scrolling is needed on mobile
  useEffect(() => {
    const checkScrollNeed = () => {
      if (window.innerWidth <= 768) {
        setShowScrollHint(true);
        // Hide hint after 3 seconds
        setTimeout(() => setShowScrollHint(false), 3000);
      }
    };
    
    checkScrollNeed();
  }, [currentDate]); // Re-check when month changes

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
      {showScrollHint && (
        <div className={styles.scrollHint}>
          ← Swipe to see full calendar →
        </div>
      )}
      <div className={styles.calendarContainer}>
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
                    <div 
                      className={`${styles.badge} ${styles[event.type]}`}
                      data-tooltip={event.fullVendorName || event.label}
                    >
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
