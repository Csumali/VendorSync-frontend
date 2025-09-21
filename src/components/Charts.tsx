'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Vendor, OptimizationMode } from '@/types';
import styles from './Charts.module.css';

interface ChartsProps {
  vendors: Vendor[];
  savingsSeries: number[];
  optimizationMode: OptimizationMode;
}

/* ========================= Types (from payments page) ========================= */

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
  paidAt: string | null;
  paidTs: number | null;
  daysLeft: number | null;
  paymentTerms?: string | null;
  earlyPayDiscount?: number | null;
  earlyPayDays?: number | null;
};

/* ========================= Helper functions (from payments page) ========================= */

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

function toPaidTs(paidIso: string | null): number | null {
  return toTs(paidIso);
}

function normalizeInvoice(x: InvoiceRaw): InvoiceView {
  const paidIso = x.paidDate ?? null;
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
    paidAt: paidIso,
    paidTs: toPaidTs(paidIso),
    daysLeft: null, // We don't need this for the chart
    paymentTerms: x.paymentTerms ?? null,
    earlyPayDiscount: x.earlyPayDiscount != null ? toNumber(x.earlyPayDiscount) : null,
    earlyPayDays: x.earlyPayDays ?? null,
  };
}

export default function Charts({ vendors, savingsSeries, optimizationMode }: ChartsProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<{ months: string[], amounts: number[] }>({ months: [], amounts: [] });
  const [loading, setLoading] = useState(true);

  const apiBase = getApiBase();

  async function getAuthHeaders() {
    const token = await getToken();
    return {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit;
  }

  // Fetch invoices directly like payments page
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        console.log('Charts: Fetching invoices...');
        
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBase}/vendor/invoice/all`, { headers, cache: 'no-store' });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`Fetch invoices failed ${res.status} ${t}`);
        }
        const json = await res.json();
        const list: InvoiceRaw[] = Array.isArray(json) ? json : (json?.invoices ?? []);
        const views = list.map(normalizeInvoice);

        if (!cancelled) {
          console.log('Charts: Fetched invoices:', views.length);
          setInvoices(views);
        }
      } catch (e: any) {
        console.error('Charts: Error fetching invoices:', e?.message ?? 'Failed to load invoices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, apiBase]);

  const drawCashFlowChart = (canvas: HTMLCanvasElement, months: string[], amounts: number[]) => {
    console.log('Charts: drawCashFlowChart called with:', { months, amounts });
    const ctx = canvas.getContext('2d');
    if (!ctx || months.length === 0 || amounts.length === 0) {
      console.log('Charts: drawCashFlowChart early return - ctx:', !!ctx, 'months:', months.length, 'amounts:', amounts.length);
      return;
    }

    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b121a';
    ctx.fillRect(0, 0, w / devicePixelRatio, h / devicePixelRatio);

    const pad = 18;
    const W = canvas.clientWidth - pad * 2;
    const H = canvas.clientHeight - pad * 2;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const range = (max - min) || 1;

    // Draw grid lines
    ctx.strokeStyle = '#223142';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = pad + (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + W, y);
      ctx.stroke();
    }

    // Draw month labels on X-axis
    ctx.fillStyle = '#9fb0c0';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    months.forEach((month, i) => {
      const x = pad + (W / (months.length - 1)) * i;
      ctx.fillText(month, x, pad + H + 14);
    });

    // Draw Y-axis labels
    ctx.textAlign = 'right';
    ctx.font = '10px system-ui';
    for (let i = 0; i < 5; i++) {
      const value = min + (range / 4) * i;
      const y = pad + H - (H / 4) * i;
      ctx.fillText(`$${(value / 1000).toFixed(0)}k`, pad - 8, y + 3);
    }

    // Draw line
    ctx.beginPath();
    amounts.forEach((amount, i) => {
      const x = pad + (W / (amounts.length - 1)) * i;
      const y = pad + H - ((amount - min) / range) * H;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#7cc4ff');
    grad.addColorStop(1, '#19476b');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Fill under the line
    const path = new Path2D();
    amounts.forEach((amount, i) => {
      const x = pad + (W / (amounts.length - 1)) * i;
      const y = pad + H - ((amount - min) / range) * H;
      i ? path.lineTo(x, y) : path.moveTo(x, y);
    });
    path.lineTo(pad + W, pad + H);
    path.lineTo(pad, pad + H);
    path.closePath();
    const fill = ctx.createLinearGradient(0, pad, 0, pad + H);
    fill.addColorStop(0, 'rgba(124, 196, 255, 0.25)');
    fill.addColorStop(1, 'rgba(25, 71, 107, 0.05)');
    ctx.fillStyle = fill;
    ctx.fill(path);
  };

  const drawBarChart = (canvas: HTMLCanvasElement, labels: string[], values: number[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b121a';
    ctx.fillRect(0, 0, w / devicePixelRatio, h / devicePixelRatio);

    const pad = 18;
    const W = canvas.clientWidth - pad * 2;
    const H = canvas.clientHeight - pad * 2;
    const maxVal = Math.max(...values.map(v => Math.abs(v))) || 1;
    
    // Calculate responsive bar width and spacing
    const minBarWidth = 20;
    const maxBarWidth = 60;
    const availableWidth = W - (values.length - 1) * 10; // 10px spacing between bars
    const calculatedBarWidth = Math.max(minBarWidth, Math.min(maxBarWidth, availableWidth / values.length));
    const barSpacing = (W - calculatedBarWidth * values.length) / (values.length - 1);

    // axis
    ctx.strokeStyle = '#223142';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad + H);
    ctx.lineTo(pad + W, pad + H);
    ctx.stroke();

    // Set font for measuring text
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#9fb0c0';
    ctx.textAlign = 'center';

    values.forEach((v, i) => {
      const x = pad + i * (calculatedBarWidth + barSpacing);
      const hVal = (v / maxVal) * (H * 0.9); // All values are positive (invoice totals)
      const y = pad + H - hVal;
      
      // Draw bar (all bars go up since they're invoice totals)
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#8affc1'); // Green gradient for positive values
      grad.addColorStop(1, '#0f6e4b');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, calculatedBarWidth, hVal);
      
      // Draw label with responsive text handling
      const label = labels[i];
      const maxLabelWidth = calculatedBarWidth + 10; // Allow slight overflow
      const labelX = x + calculatedBarWidth / 2;
      
      // Measure text width
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      
      if (textWidth <= maxLabelWidth) {
        // Text fits, draw normally
        ctx.fillText(label, labelX, pad + H + 14);
      } else {
        // Text is too long, truncate with ellipsis
        let truncatedLabel = label;
        let truncatedWidth = textWidth;
        
        while (truncatedWidth > maxLabelWidth && truncatedLabel.length > 3) {
          truncatedLabel = truncatedLabel.slice(0, -4) + '...';
          truncatedWidth = ctx.measureText(truncatedLabel).width;
        }
        
        ctx.fillText(truncatedLabel, labelX, pad + H + 14);
      }
    });
  };

  // Calculate monthly totals from fetched invoices
  useEffect(() => {
    if (invoices.length === 0) return;
    
    console.log('Charts: Calculating monthly totals from', invoices.length, 'invoices');
    
    // Get the last 12 months
    const now = new Date();
    const months: string[] = [];
    const amounts: number[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push(monthName);
      
      // Calculate total amount for this month from ALL invoices (not just paid)
      const monthTotal = invoices
        .filter(invoice => {
          if (!invoice.date) return false;
          const invoiceDate = new Date(invoice.date);
          return invoiceDate.getFullYear() === date.getFullYear() && 
                 invoiceDate.getMonth() === date.getMonth();
        })
        .reduce((sum, invoice) => {
          const amount = invoice.totalAmount;
          return Number.isFinite(amount) && amount >= 0 ? sum + amount : sum;
        }, 0);
      
      console.log(`Charts: ${monthName} - ${invoices.filter(inv => {
        if (!inv.date) return false;
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === date.getFullYear() && invDate.getMonth() === date.getMonth();
      }).length} invoices, total: $${monthTotal}`);
      
      amounts.push(Math.round(monthTotal));
    }
    
    const data = { months, amounts };
    console.log('Charts: Final monthly totals:', data);
    setMonthlyTotals(data);
  }, [invoices]);

  useEffect(() => {
    console.log('Charts: useEffect triggered, monthlyTotals:', monthlyTotals);
    if (lineChartRef.current && monthlyTotals.months.length > 0) {
      console.log('Charts: Drawing chart with data:', monthlyTotals);
      drawCashFlowChart(lineChartRef.current, monthlyTotals.months, monthlyTotals.amounts);
    } else {
      console.log('Charts: Not drawing chart - lineChartRef:', !!lineChartRef.current, 'months length:', monthlyTotals.months.length);
    }
  }, [monthlyTotals]);

  useEffect(() => {
    if (barChartRef.current && invoices.length > 0) {
      // Calculate total invoice amount for each vendor
      const vendorTotals = vendors.map(vendor => {
        // Match vendors by name since Vendor type doesn't have id
        const vendorInvoices = invoices.filter(invoice => {
          // Try to match by vendor name (this is a simplified approach)
          // In a real app, you'd want to match by ID or have a better mapping
          return invoice.vendorName?.toLowerCase().includes(vendor.name.toLowerCase()) ||
                 vendor.name.toLowerCase().includes(invoice.vendorName?.toLowerCase() || '');
        });
        const totalAmount = vendorInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        return { vendor, totalAmount };
      });

      // Sort by total amount (highest first) and take top 5
      const topVendors = vendorTotals
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      // Create shorter, more readable vendor names
      const labels = topVendors.map(({ vendor }) => {
        const name = vendor.name;
        if (name.length > 15) {
          const words = name.split(/[\s\-_&]+/);
          const meaningfulWords = words.filter(word => 
            word.length > 2 && 
            !['the', 'and', 'of', 'for', 'inc', 'llc', 'corp', 'ltd', 'co'].includes(word.toLowerCase())
          );
          
          if (meaningfulWords.length > 0) {
            return meaningfulWords[0].substring(0, 12);
          }
          
          return name.substring(0, 12);
        }
        
        return name;
      });

      const values = topVendors.map(({ totalAmount }) => totalAmount);
      
      console.log('Charts: Top vendors by invoice total:', topVendors.map(v => ({ name: v.vendor.name, total: v.totalAmount })));
      drawBarChart(barChartRef.current, labels, values);
    }
  }, [vendors, invoices]);

  useEffect(() => {
    const handleResize = () => {
      if (lineChartRef.current && monthlyTotals.months.length > 0) {
        drawCashFlowChart(lineChartRef.current, monthlyTotals.months, monthlyTotals.amounts);
      }
      if (barChartRef.current && invoices.length > 0) {
        // Calculate total invoice amount for each vendor (same logic as above)
        const vendorTotals = vendors.map(vendor => {
          // Match vendors by name since Vendor type doesn't have id
          const vendorInvoices = invoices.filter(invoice => {
            return invoice.vendorName?.toLowerCase().includes(vendor.name.toLowerCase()) ||
                   vendor.name.toLowerCase().includes(invoice.vendorName?.toLowerCase() || '');
          });
          const totalAmount = vendorInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
          return { vendor, totalAmount };
        });

        const topVendors = vendorTotals
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5);

        const labels = topVendors.map(({ vendor }) => {
          const name = vendor.name;
          if (name.length > 15) {
            const words = name.split(/[\s\-_&]+/);
            const meaningfulWords = words.filter(word => 
              word.length > 2 && 
              !['the', 'and', 'of', 'for', 'inc', 'llc', 'corp', 'ltd', 'co'].includes(word.toLowerCase())
            );
            
            if (meaningfulWords.length > 0) {
              return meaningfulWords[0].substring(0, 12);
            }
            
            return name.substring(0, 12);
          }
          
          return name;
        });

        const values = topVendors.map(({ totalAmount }) => totalAmount);
        drawBarChart(barChartRef.current, labels, values);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [vendors, monthlyTotals, invoices]);

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
  }, [vendors, savingsSeries]); // Re-check when data changes

  return (
    <div className={styles.charts}>
      {showScrollHint && (
        <div className={styles.scrollHint}>
          ← Swipe charts to see full data →
        </div>
      )}
        <div className={styles.card}>
          <h3>Monthly Invoice Flow</h3>
          <div className={styles.chartContainer}>
            <canvas ref={lineChartRef} height={160}></canvas>
          </div>
          <div className={styles.footer}>
            <span>Optimization Mode: <strong>{optimizationMode}</strong></span>
            <span className={styles.deltaUp}>Based on all invoices</span>
          </div>
        </div>
      <div className={styles.card}>
        <h3>Top Vendors by Invoice Total</h3>
        <div className={styles.chartContainer}>
          <canvas ref={barChartRef} height={140}></canvas>
        </div>
        <div className={styles.footer}>
          <span>🧾 Top 5 vendors by total invoice amount</span>
          <span className={styles.deltaUp}>Based on all invoices</span>
        </div>
      </div>
    </div>
  );
}
