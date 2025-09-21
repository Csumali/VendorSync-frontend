'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth, SignIn } from '@clerk/nextjs';
import Link from 'next/link';

import Sidebar from '@/components/Sidebar';
import Header, { type OptimizationMode } from '@/components/Header';
import { addToGlobalTotalSpend, subtractFromGlobalTotalSpend, getGlobalTotalSpend } from '@/data/dataService';

/* ========================= Types ========================= */

type InvoiceRaw = {
  id: string;
  invoiceNumber?: string | null;
  date?: string | null;
  dueDate?: string | null;

  subtotal?: string | number | null;
  totalAmount?: string | number | null;

  paidDate?: string | null;     // <-- server field
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
  date: string | null;     // ISO
  dueDate: string | null;  // ISO

  subtotal: number;
  totalAmount: number;

  status: 'paid' | 'pending';
  paidAt: string | null;   // internal UI field mapped from server's paidDate
  paidTs: number | null;

  daysLeft: number | null;

  paymentTerms?: string | null;
  earlyPayDiscount?: number | null;
  earlyPayDays?: number | null;
};

/* ========================= Env / API helpers ========================= */

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

function fmtDate(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) {
    // fallback: strip time if included
    return String(input).split('T')[0] ?? String(input);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function toPaidTs(paidIso: string | null): number | null {
  return toTs(paidIso);
}

function money(val: unknown): string {
  const n = toNumber(val);
  return `$${n.toFixed(2)}`;
}

/* ========================= Payments page ========================= */

type Tab = 'pending' | 'history';

export default function PaymentsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // layout state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<OptimizationMode>('Balanced');

  // data state
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // dialogs
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteVendorId, setConfirmDeleteVendorId] = useState<string | null>(null);

  const apiBase = getApiBase();

  async function getAuthHeaders() {
    const token = await getToken();
    return {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit;
  }

  /* ---------------- Fetch invoices ---------------- */

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const headers = await getAuthHeaders();
        // Adjust if your endpoint is different. Expecting array.
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
          // hydrate vendor names found in list
          const ids = Array.from(new Set(views.map(v => v.vendorId).filter(Boolean)));
          hydrateVendorNames(ids, headers);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load invoices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, apiBase]);

  async function hydrateVendorNames(ids: string[], headers: HeadersInit) {
    const pairs = await Promise.all(ids.map(async id => {
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
  }

  /* ---------------- Normalization ---------------- */

  function normalizeInvoice(x: InvoiceRaw): InvoiceView {
    const paidIso = x.paidDate ?? null; // map server -> UI
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

      daysLeft: status === 'pending' ? daysFromToday(dueTs) : null,

      paymentTerms: x.paymentTerms ?? null,
      earlyPayDiscount: x.earlyPayDiscount != null ? toNumber(x.earlyPayDiscount) : null,
      earlyPayDays: x.earlyPayDays ?? null,
    };
  }

  /* ---------------- Mark paid / unpaid ---------------- */

  async function markAsPaid(inv: InvoiceView) {
    const nowIso = new Date().toISOString();
    const prev = invoices;

    setInvoices(prev =>
      prev.map(i =>
        i.id === inv.id
          ? { ...i, status: 'paid', paidAt: nowIso, paidTs: toPaidTs(nowIso) }
          : i
      )
    );

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBase}/vendor/${inv.vendorId}/invoice/${inv.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paidDate: nowIso,                 // <-- write server field
          paidAmount: inv.totalAmount,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Mark paid failed: ${res.status} ${t}`);
      }
      
      // Update global total spend
      addToGlobalTotalSpend(inv.totalAmount);
      
      // Dispatch custom event to update total spend in dashboard
      window.dispatchEvent(new CustomEvent('total-spend-update', {
        detail: { amount: inv.totalAmount, action: 'add' }
      }));
      
      // Also dispatch the general dashboard refresh event
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      
    } catch (e) {
      setInvoices(prev); // rollback
      alert((e as any)?.message ?? 'Failed to mark as paid');
    }
  }

  async function markAsUnpaid(inv: InvoiceView) {
    const prev = invoices;
    const newDaysLeft = daysFromToday(toTs(inv.dueDate));
    setInvoices(prev =>
      prev.map(i =>
        i.id === inv.id
          ? { ...i, status: 'pending', paidAt: null, paidTs: null, daysLeft: newDaysLeft }
          : i
      )
    );

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBase}/vendor/${inv.vendorId}/invoice/${inv.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          paidDate: null,                    // <-- clear server field
          paidAmount: null,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Mark unpaid failed: ${res.status} ${t}`);
      }
      
      // Update global total spend
      subtractFromGlobalTotalSpend(inv.totalAmount);
      
      // Dispatch custom event to update total spend in dashboard
      window.dispatchEvent(new CustomEvent('total-spend-update', {
        detail: { amount: inv.totalAmount, action: 'subtract' }
      }));
      
      // Also dispatch the general dashboard refresh event
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      
    } catch (e) {
      setInvoices(prev); // rollback
      alert((e as any)?.message ?? 'Failed to mark as unpaid');
    }
  }

  /* ---------------- Edit / Delete ---------------- */

  async function saveEdit(invId: string, vendorId: string, patch: Partial<InvoiceView>) {
    const prev = invoices;
    // optimistic
    setInvoices(prev => prev.map(i => (i.id === invId ? { ...i, ...patch } : i)));
    try {
      const headers = await getAuthHeaders();
      const body: any = {
        invoiceNumber: patch.invoiceNumber,
        date: patch.date,
        dueDate: patch.dueDate,
        subtotal: patch.subtotal,
        totalAmount: patch.totalAmount,
        paymentTerms: patch.paymentTerms,
        earlyPayDiscount: patch.earlyPayDiscount,
        earlyPayDays: patch.earlyPayDays,
      };
      const res = await fetch(`${apiBase}/vendor/${vendorId}/invoice/${invId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Update failed: ${res.status} ${t}`);
      }
      setEditId(null);
    } catch (e) {
      setInvoices(prev); // rollback
      alert((e as any)?.message ?? 'Failed to update invoice');
    }
  }

  async function deleteInvoice(invId: string, vendorId: string) {
    const prev = invoices;
    setInvoices(prev => prev.filter(i => i.id !== invId));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBase}/vendor/${vendorId}/invoice/${invId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Delete failed: ${res.status} ${t}`);
      }
      setConfirmDeleteId(null);
      setConfirmDeleteVendorId(null);
    } catch (e) {
      setInvoices(prev); // rollback
      alert((e as any)?.message ?? 'Failed to delete invoice');
    }
  }

  /* ---------------- Filtering & Sorting ---------------- */

  const withVendorNames = useMemo(() => {
    return invoices.map(i => ({
      ...i,
      vendorName: vendorNames[i.vendorId] ?? i.vendorName ?? null,
    }));
  }, [invoices, vendorNames]);

  const pending = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = withVendorNames.filter(i => i.status === 'pending');
    if (q) {
      list = list.filter(i =>
        [
          i.invoiceNumber,
          i.vendorName ?? i.vendorId,
          i.paymentTerms ?? '',
          i.totalAmount,
          i.subtotal,
        ].join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    // sort by soonest due date ascending
    return list.sort((a, b) => (toTs(a.dueDate) ?? Infinity) - (toTs(b.dueDate) ?? Infinity));
  }, [withVendorNames, query]);

  const history = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = withVendorNames.filter(i => i.status === 'paid');
    if (q) {
      list = list.filter(i =>
        [
          i.invoiceNumber,
          i.vendorName ?? i.vendorId,
          i.paymentTerms ?? '',
          i.totalAmount,
          i.subtotal,
        ].join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    // sort by paidDate (paidAt) desc
    return list.sort((a, b) => (b.paidTs ?? -Infinity) - (a.paidTs ?? -Infinity));
  }, [withVendorNames, query]);

  /* ---------------- UI gates ---------------- */

  if (!isLoaded) return <div className="grid h-dvh place-items-center">Loading…</div>;
  if (!isSignedIn) {
    return (
      <main className="min-h-dvh grid place-items-center p-6">
        <div className="mb-4 text-center space-y-2">
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-[var(--subtext)]">Please sign in to view invoices</p>
        </div>
        <SignIn />
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--app)] overflow-x-hidden">
      <div className="grid md:grid-cols-[16rem_1fr] items-stretch">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="min-w-0 flex flex-col">
          <Header
            optimizationMode={mode}
            onModeChange={setMode}
            onOpenSidebar={() => setMobileOpen(true)}
          />

          <main className="space-y-4 p-4 md:p-6">
            {/* Title + Tabs + Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold">Payments</h1>
                <div className="text-xs text-[var(--subtext)]">
                  Manage and track invoices
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1">
                  <button
                    onClick={() => setTab('pending')}
                    className={`rounded-md px-3 py-1 text-sm ${tab === 'pending' ? 'bg-black/20' : 'hover:bg-black/10'}`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setTab('history')}
                    className={`rounded-md px-3 py-1 text-sm ${tab === 'history' ? 'bg-black/20' : 'hover:bg-black/10'}`}
                  >
                    History
                  </button>
                </div>

                <input
                  placeholder="Search invoices (number, vendor, terms)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--subtext)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:min-w-72"
                />
              </div>
            </div>

            {/* Loading / Error */}
            {loading && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-[var(--subtext)]">
                Loading invoices…
              </div>
            )}
            {!loading && err && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-red-400">
                Error: {err}
              </div>
            )}

            {/* ======== PENDING TAB ======== */}
            {!loading && !err && tab === 'pending' && (
              <>
                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {pending.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-[var(--subtext)]">
                      No pending invoices.
                    </div>
                  ) : (
                    pending.map(inv => (
                      <article key={inv.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-base font-semibold">{inv.invoiceNumber || '—'}</div>
                          <span className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs text-yellow-200">pending</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-[var(--subtext)]">Vendor:</span> {inv.vendorName ?? inv.vendorId}</div>
                          <div><span className="text-[var(--subtext)]">Due:</span> {fmtDate(inv.dueDate)}</div>
                          <div><span className="text-[var(--subtext)]">Total:</span> {money(inv.totalAmount)}</div>
                          <div><span className="text-[var(--subtext)]">Days left:</span> {inv.daysLeft ?? '—'}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => markAsPaid(inv)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                          >
                            Mark as Paid
                          </button>
                          <button
                            onClick={() => setEditId(inv.id)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(inv.id); setConfirmDeleteVendorId(inv.vendorId); }}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] md:block">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left">
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Invoice</th>
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Vendor</th>
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Due</th>
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Total</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--subtext)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-6 text-center text-[var(--subtext)]">No pending invoices.</td></tr>
                        ) : (
                          pending.map(inv => (
                            <tr key={inv.id} className="border-b border-[var(--border)]">
                              <td className="px-3 py-3">{inv.invoiceNumber || '—'}</td>
                              <td className="px-3 py-3">{inv.vendorName ?? inv.vendorId}</td>
                              <td className="px-3 py-3">{fmtDate(inv.dueDate)}</td>
                              <td className="px-3 py-3">{money(inv.totalAmount)}</td>
                              <td className="px-3 py-3 text-right">
                                <div className="inline-flex flex-wrap gap-2">
                                  <button
                                    onClick={() => markAsPaid(inv)}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                                  >
                                    Mark Paid
                                  </button>
                                  <button
                                    onClick={() => setEditId(inv.id)}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { setConfirmDeleteId(inv.id); setConfirmDeleteVendorId(inv.vendorId); }}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ======== HISTORY TAB ======== */}
            {!loading && !err && tab === 'history' && (
              <>
                <div className="space-y-3 md:hidden">
                  {history.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-[var(--subtext)]">
                      No paid invoices yet.
                    </div>
                  ) : (
                    history.map(inv => (
                      <article key={inv.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-base font-semibold">{inv.invoiceNumber || '—'}</div>
                          <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">paid</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-[var(--subtext)]">Vendor:</span> {inv.vendorName ?? inv.vendorId}</div>
                          <div><span className="text-[var(--subtext)]">Paid on:</span> {fmtDate(inv.paidAt)}</div>
                          <div><span className="text-[var(--subtext)]">Total:</span> {money(inv.totalAmount)}</div>
                          <div><span className="text-[var(--subtext)]">Due:</span> {fmtDate(inv.dueDate)}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => markAsUnpaid(inv)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                          >
                            Mark as Unpaid
                          </button>
                          <button
                            onClick={() => setEditId(inv.id)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(inv.id); setConfirmDeleteVendorId(inv.vendorId); }}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] md:block">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left">
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Invoice</th>
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Vendor</th>
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Paid on</th>
                          <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Total</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--subtext)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-6 text-center text-[var(--subtext)]">No paid invoices yet.</td></tr>
                        ) : (
                          history.map(inv => (
                            <tr key={inv.id} className="border-b border-[var(--border)]">
                              <td className="px-3 py-3">{inv.invoiceNumber || '—'}</td>
                              <td className="px-3 py-3">{inv.vendorName ?? inv.vendorId}</td>
                              <td className="px-3 py-3">{fmtDate(inv.paidAt)}</td>
                              <td className="px-3 py-3">{money(inv.totalAmount)}</td>
                              <td className="px-3 py-3 text-right">
                                <div className="inline-flex flex-wrap gap-2">
                                  <button
                                    onClick={() => markAsUnpaid(inv)}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                                  >
                                    Mark Unpaid
                                  </button>
                                  <button
                                    onClick={() => setEditId(inv.id)}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { setConfirmDeleteId(inv.id); setConfirmDeleteVendorId(inv.vendorId); }}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            {!loading && !err && (
              <div className="text-xs text-[var(--subtext)]">
                Showing {tab === 'pending' ? pending.length : history.length} of {invoices.length} invoices.
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ======= Edit Invoice Modal ======= */}
      {editId && (() => {
        const inv = invoices.find(i => i.id === editId)!;
        return (
          <EditInvoiceModal
            key={inv.id}
            invoice={inv}
            onClose={() => setEditId(null)}
            onSave={(patch) => saveEdit(inv.id, inv.vendorId, patch)}
          />
        );
      })()}

      {/* ======= Delete Confirm ======= */}
      {confirmDeleteId && confirmDeleteVendorId && (
        <ConfirmDialog
          title="Delete invoice?"
          body="This will permanently remove the invoice and cannot be undone."
          confirmText="Delete"
          variant="danger"
          onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteVendorId(null); }}
          onConfirm={() => deleteInvoice(confirmDeleteId, confirmDeleteVendorId)}
        />
      )}
    </div>
  );
}

/* ========================= Modals ========================= */

function ConfirmDialog({
  title,
  body,
  confirmText = 'Confirm',
  variant = 'default',
  onCancel,
  onConfirm,
}: {
  title: string;
  body?: string;
  confirmText?: string;
  variant?: 'default' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl p-4">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        {body && <p className="mb-4 text-sm text-[var(--subtext)]">{body}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-sm ${
              variant === 'danger'
                ? 'border border-[var(--border)] text-red-300 hover:bg-red-500/10'
                : 'border border-[var(--border)] hover:bg-black/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditInvoiceModal({
  invoice,
  onClose,
  onSave,
}: {
  invoice: InvoiceView;
  onClose: () => void;
  onSave: (patch: Partial<InvoiceView>) => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber);
  const [date, setDate] = useState(invoice.date ? fmtDate(invoice.date) : '');
  const [dueDate, setDueDate] = useState(invoice.dueDate ? fmtDate(invoice.dueDate) : '');
  const [subtotal, setSubtotal] = useState(String(invoice.subtotal));
  const [totalAmount, setTotalAmount] = useState(String(invoice.totalAmount));
  const [paymentTerms, setPaymentTerms] = useState(invoice.paymentTerms ?? '');
  const [earlyPayDiscount, setEarlyPayDiscount] = useState(
    invoice.earlyPayDiscount != null ? String(invoice.earlyPayDiscount) : ''
  );
  const [earlyPayDays, setEarlyPayDays] = useState(
    invoice.earlyPayDays != null ? String(invoice.earlyPayDays) : ''
  );

  function handleSave() {
    onSave({
      invoiceNumber: invoiceNumber.trim(),
      date: date ? new Date(date).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      subtotal: toNumber(subtotal),
      totalAmount: toNumber(totalAmount),
      paymentTerms: paymentTerms || null,
      earlyPayDiscount: earlyPayDiscount ? toNumber(earlyPayDiscount) : null,
      earlyPayDays: earlyPayDays ? Number(earlyPayDays) : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl p-4">
        <h3 className="mb-4 text-lg font-semibold">Edit Invoice</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Invoice #</span>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Total</span>
            <input
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Subtotal</span>
            <input
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Invoice Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-[var(--subtext)]">Payment Terms</span>
            <input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Early Pay Discount (%)</span>
            <input
              value={earlyPayDiscount}
              onChange={(e) => setEarlyPayDiscount(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Early Pay Days</span>
            <input
              value={earlyPayDays}
              onChange={(e) => setEarlyPayDays(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm hover:brightness-110"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
