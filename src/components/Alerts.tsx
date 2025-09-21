'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Alert } from '@/types';
import styles from './Alerts.module.css';

interface AlertsProps {
  alerts: Alert[];
}

type InvoiceRaw = {
  id: string;
  invoiceNumber?: string | null;
  date?: string | null;
  dueDate?: string | null;
  subtotal?: string | number | null;
  totalAmount?: string | number | null;
  paidDate?: string | null;
  paidAmount?: string | number | null;
  status?: 'paid' | 'pending' | string | null;
  paymentTerms?: string | null;
  earlyPayDiscount?: string | number | null;
  earlyPayDays?: number | null;
  vendor?: { id: string } | null;
};

type InvoiceView = {
  id: string;
  vendorId: string;
  vendorName?: string | null;
  invoiceNumber: string;
  date: string | null;
  dueDate: string | null;
  subtotal: number;
  totalAmount: number;
  status: 'paid' | 'pending';
  daysLeft: number | null;
};

// Helper functions (same as payments page)
function getApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_BASE;
  if (direct) return direct.replace(/\/$/, '');
  const vendorsUrl = process.env.NEXT_PUBLIC_VENDORS_API_URL;
  if (vendorsUrl) return vendorsUrl.replace(/\/vendor.*$/i, '').replace(/\/$/, '');
  throw new Error('API base not configured. Set NEXT_PUBLIC_API_BASE in .env.local');
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function toTs(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function daysFromToday(ts: number | null): number | null {
  if (ts == null) return null;
  const one = 24 * 60 * 60 * 1000;
  const today = new Date();
  const utcMid = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((ts - utcMid) / one);
}

function fmtDate(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) {
    return String(input).split('T')[0] ?? String(input);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function money(val: unknown): string {
  const n = toNumber(val);
  return `$${n.toFixed(2)}`;
}

function normalizeInvoice(x: InvoiceRaw): InvoiceView {
  const dueIso = x.dueDate ?? null;
  const dueTs = toTs(dueIso);
  const status: 'paid' | 'pending' = (x.status === 'paid') ? 'paid' : 'pending';

  return {
    id: x.id,
    vendorId: x.vendor?.id ?? '',
    vendorName: null,
    invoiceNumber: (x.invoiceNumber ?? '').toString(),
    date: x.date ?? null,
    dueDate: dueIso,
    subtotal: toNumber(x.subtotal),
    totalAmount: toNumber(x.totalAmount),
    status,
    daysLeft: status === 'pending' ? daysFromToday(dueTs) : null,
  };
}

export default function Alerts({ alerts }: AlertsProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch invoices (same pattern as payments page)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const apiBase = getApiBase();
        const headers = {
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as HeadersInit;

        const res = await fetch(`${apiBase}/vendor/invoice/all`, { headers, cache: 'no-store' });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`Fetch invoices failed ${res.status} ${t}`);
        }
        
        const json = await res.json();
        const list: InvoiceRaw[] = Array.isArray(json) ? json : (json?.invoices ?? []);
        const views = list.map(normalizeInvoice);

        if (!cancelled) {
          setInvoices(views);
          // Hydrate vendor names
          const ids = Array.from(new Set(views.map(v => v.vendorId).filter(Boolean)));
          hydrateVendorNames(ids, headers);
        }
      } catch (e: any) {
        console.error('Error loading invoices for alerts:', e?.message ?? 'Failed to load invoices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  // Hydrate vendor names (same as payments page)
  const hydrateVendorNames = async (vendorIds: string[], headers: HeadersInit) => {
    const apiBase = getApiBase();
    const pairs = await Promise.all(vendorIds.map(async id => {
      try {
        const r = await fetch(`${apiBase}/vendor/${id}`, { headers, cache: 'no-store' });
        if (!r.ok) return [id, null] as const;
        const v = await r.json();
        return [id, (v?.name ?? '').toString().trim() || null] as const;
      } catch { return [id, null] as const; }
    }));
    const map: Record<string, string> = {};
    pairs.forEach(([id, name]) => { if (name) map[id] = name; });
    if (Object.keys(map).length) setVendorNames(prev => ({ ...prev, ...map }));
  };

  // Filter upcoming invoices (due within next 7 days and still pending)
  const upcomingInvoices = invoices.filter(invoice => {
    if (invoice.status !== 'pending') return false;
    if (!invoice.daysLeft) return false;
    return invoice.daysLeft >= 0 && invoice.daysLeft <= 7; // Due within next 7 days
  }).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)); // Sort by soonest first

  // Filter overdue invoices (due before current date and still pending)
  const overdueInvoices = invoices.filter(invoice => {
    if (invoice.status !== 'pending') return false;
    if (!invoice.daysLeft) return false;
    return invoice.daysLeft < 0; // Overdue
  }).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)); // Sort by most overdue first

  // Handle View button click - redirect to payments page
  const handleViewClick = () => {
    router.push('/payments');
  };

  return (
    <div className={styles.card}>
      <h3>Alert Center</h3>
      <div className={styles.alerts}>
        {/* Show original alerts */}
        {alerts.map((alert, index) => (
          <div key={`alert-${index}`} className={styles.alert}>
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
        
        {/* Show overdue invoices */}
        {loading ? (
          <div className={styles.alert}>
            <div className={styles.msg}>
              <span className={`${styles.dot} ${styles.warn}`}></span>
              <div>Loading invoices...</div>
            </div>
          </div>
        ) : (
          <>
            {/* Overdue invoices (red alerts) */}
            {overdueInvoices.map(invoice => {
              const vendorName = vendorNames[invoice.vendorId] ?? invoice.vendorName ?? invoice.vendorId;
              const daysOverdue = Math.abs(invoice.daysLeft ?? 0);
              const alertText = `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
              
              return (
                <div key={`overdue-${invoice.id}`} className={styles.alert}>
                  <div className={styles.msg}>
                    <span className={`${styles.dot} ${styles.danger}`}></span>
                    <div>
                      <div className="font-semibold">{invoice.invoiceNumber || '—'}</div>
                      <div className="text-sm text-[var(--subtext)]">
                        {vendorName} • {money(invoice.totalAmount)} • Due: {fmtDate(invoice.dueDate)} • {alertText}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button className={styles.btn} onClick={handleViewClick}>View</button>
                  </div>
                </div>
              );
            })}

            {/* Upcoming invoices (green alerts) */}
            {upcomingInvoices.map(invoice => {
              const vendorName = vendorNames[invoice.vendorId] ?? invoice.vendorName ?? invoice.vendorId;
              const daysLeft = invoice.daysLeft ?? 0;
              const alertText = daysLeft === 0 
                ? 'Due today' 
                : daysLeft === 1 
                  ? 'Due tomorrow' 
                  : `Due in ${daysLeft} days`;
              
              return (
                <div key={`upcoming-${invoice.id}`} className={styles.alert}>
                  <div className={styles.msg}>
                    <span className={`${styles.dot} ${styles.ok}`}></span>
                    <div>
                      <div className="font-semibold">{invoice.invoiceNumber || '—'}</div>
                      <div className="text-sm text-[var(--subtext)]">
                        {vendorName} • {money(invoice.totalAmount)} • Due: {fmtDate(invoice.dueDate)} • {alertText}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button className={styles.btn} onClick={handleViewClick}>View</button>
                  </div>
                </div>
              );
            })}

            {/* No alerts message */}
            {overdueInvoices.length === 0 && upcomingInvoices.length === 0 && (
              <div className={styles.alert}>
                <div className={styles.msg}>
                  <span className={`${styles.dot} ${styles.ok}`}></span>
                  <div>No upcoming or overdue invoices</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
