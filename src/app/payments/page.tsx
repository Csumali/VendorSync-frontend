'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, SignIn } from '@clerk/nextjs';

import Sidebar from '@/components/Sidebar';
import Header, { type OptimizationMode } from '@/components/Header';

/* ========================= Types ========================= */

type InvoiceRaw = {
  id?: string;
  vendorId?: string;
  vendor?: { id?: string; name?: string };
  vendorName?: string;

  invoiceNumber?: string;
  date?: string | null;
  dueDate?: string | null;

  subtotal?: number | string | null;
  totalAmount?: number | string | null;

  paymentTerms?: string | null;
  earlyPayDiscount?: number | null;

  status?: 'open' | 'paid' | 'void' | string | null;
  paidAt?: string | null;
};

type InvoiceView = {
  id: string;
  vendorId: string | null;
  vendorName: string | null;
  invoiceNumber: string;
  date: string | null;
  dueDate: string | null;
  subtotal: number | null;
  totalAmount: number | null;
  paymentTerms: string | null;
  earlyPayDiscount: number | null;
  status: 'open' | 'paid' | 'void' | string | null;
  paidAt: string | null;

  // derived
  dueTs: number;   // Infinity if missing
  daysLeft: number | null;
  paidTs: number;  // -Infinity if missing (so paid sort can put unknowns last)
};

/* ========================= Helpers ========================= */

function getApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_BASE;
  if (direct) return direct.replace(/\/$/, '');
  const vendorsUrl = process.env.NEXT_PUBLIC_VENDORS_API_URL;
  if (vendorsUrl) return vendorsUrl.replace(/\/vendor.*$/i, '').replace(/\/$/, '');
  return '';
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const n = Number(String(val).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatMoney(val: unknown): string {
  const n = toNumber(val);
  return n === null ? '—' : `$${n.toFixed(2)}`;
}

function fmtYMD(input?: string | null): string {
  if (!input) return '—';
  const s = String(input);
  const d = new Date(s);
  if (Number.isFinite(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return s.includes('T') ? s.split('T')[0] : s;
}

function toTs(d?: string | null): number {
  if (!d) return Infinity;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : Infinity;
}
function toPaidTs(d?: string | null): number {
  if (!d) return -Infinity;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : -Infinity;
}
function daysFromToday(ts: number): number | null {
  if (!Number.isFinite(ts)) return null;
  const ms = ts - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function normalizeInvoice(x: InvoiceRaw): InvoiceView {
  const id = x.id ?? crypto.randomUUID();
  const vendorId = x.vendorId ?? x.vendor?.id ?? null;
  const vendorName = x.vendorName ?? x.vendor?.name ?? null;

  const invoiceNumber = x.invoiceNumber ?? '';
  const date = x.date ?? null;
  const dueDate = x.dueDate ?? null;

  const subtotal = toNumber(x.subtotal);
  const totalAmount = toNumber(x.totalAmount);

  const paymentTerms = x.paymentTerms ?? null;
  const earlyPayDiscount = x.earlyPayDiscount ?? null;

  const status = x.status ?? null;
  const paidAt = x.paidAt ?? null;

  const dueTs = toTs(dueDate);
  const daysLeft = daysFromToday(dueTs);
  const paidTs = toPaidTs(paidAt);

  return {
    id,
    vendorId,
    vendorName,
    invoiceNumber,
    date,
    dueDate,
    subtotal,
    totalAmount,
    paymentTerms,
    earlyPayDiscount,
    status,
    paidAt,

    dueTs,
    daysLeft,
    paidTs,
  };
}

function isPaid(inv: InvoiceView) {
  return inv.status === 'paid' || !!inv.paidAt;
}

/* ========================= Page ========================= */

type Tab = 'open' | 'history';

export default function PaymentsPage() {
  const { isLoaded, isSignedIn, getToken, userId, sessionId } = useAuth();

  // layout
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<OptimizationMode>('Balanced');

  // data
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [vendorNameMap, setVendorNameMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('open');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modals
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteVendorId, setConfirmDeleteVendorId] = useState<string | null>(null);

  const apiBase = getApiBase();
  const invoicesUrl =
    process.env.NEXT_PUBLIC_INVOICES_API_URL ||
    (apiBase ? `${apiBase}/vendor/invoice/all` : '');

  /* ---------- Fetch & hydrate ---------- */

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const token = await getToken();
        if (!invoicesUrl) {
          throw new Error(
            'Invoices endpoint not configured. Set NEXT_PUBLIC_INVOICES_API_URL or NEXT_PUBLIC_API_BASE in .env.local'
          );
        }

        const res = await fetch(invoicesUrl, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Fetch invoices failed (${res.status}) ${text}`.trim());
        }

        const data = await res.json();
        const rows: InvoiceRaw[] = Array.isArray(data) ? data : data?.invoices ?? [];
        const views = rows.map(normalizeInvoice);

        // sort open by due soonest; history by paid most-recent
        const open = views.filter(v => !isPaid(v)).sort((a, b) => a.dueTs - b.dueTs);
        const history = views.filter(v => isPaid(v)).sort((a, b) => b.paidTs - a.paidTs);
        const merged = [...open, ...history];

        if (!cancelled) {
          setInvoices(merged);
          hydrateVendorNames(merged);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load invoices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, invoicesUrl]);

  async function hydrateVendorNames(list: InvoiceView[]) {
    if (!apiBase) return;
    const ids = Array.from(new Set(list.filter(i => i.vendorId && !i.vendorName).map(i => i.vendorId!)));
    if (ids.length === 0) return;

    const token = await getToken();
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const pairs = await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetch(`${apiBase}/vendor/${id}`, { headers, cache: 'no-store' });
          if (!r.ok) return [id, null] as const;
          const v = await r.json();
          const name = (v?.name ?? '').toString().trim() || null;
          return [id, name] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );

    const map: Record<string, string> = {};
    for (const [id, name] of pairs) if (name) map[id] = name;
    if (Object.keys(map).length) {
      setVendorNameMap(prev => ({ ...prev, ...map }));
    }
  }

  /* ---------- Filtering ---------- */

  const filteredByTab = useMemo(() => {
    const list = tab === 'open' ? invoices.filter(v => !isPaid(v)) : invoices.filter(v => isPaid(v));
    // Re-apply sort per tab view
    if (tab === 'open') return [...list].sort((a, b) => a.dueTs - b.dueTs);
    return [...list].sort((a, b) => b.paidTs - a.paidTs);
  }, [invoices, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredByTab;
    return filteredByTab.filter((inv) =>
      [
        inv.invoiceNumber,
        inv.vendorName ?? '',
        inv.vendorId ?? '',
        inv.paymentTerms ?? '',
        inv.totalAmount ?? '',
        inv.subtotal ?? '',
        inv.dueDate ?? '',
        inv.paidAt ?? '',
        inv.status ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [filteredByTab, query]);

  /* ---------- Actions: mark paid / edit / delete ---------- */

  async function getAuthHeaders() {
    const token = await getToken();
    return {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit;
  }

  async function markAsPaid(inv: InvoiceView) {
    // optimistic
    const nowIso = new Date().toISOString();
    const prev = invoices;
    setInvoices(prev =>
      prev.map(i => i.id === inv.id ? { ...i, status: 'paid', paidAt: nowIso, paidTs: toPaidTs(nowIso) } : i)
    );

    try {
      const headers = await getAuthHeaders();

      // Try PATCH /invoice/:id { status: 'paid', paidAt }
      let res = await fetch(`${apiBase}/vendor/${inv.vendorId}/invoice/${inv.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidAt: nowIso }),
      });

      // Fallback: POST /invoice/:id/mark-paid
      if (!res.ok) {
        res = await fetch(`${apiBase}/invoice/${inv.id}/mark-paid`, {
          method: 'POST',
          headers,
        });
      }

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Mark paid failed: ${res.status} ${t}`);
      }
    } catch (e) {
      // rollback on failure
      setInvoices(prev);
      alert((e as any)?.message ?? 'Failed to mark as paid');
    }
  }

  async function markAsUnpaid(inv: InvoiceView) {
    // optimistic update
    const prev = invoices;
    const newDaysLeft = daysFromToday(toTs(inv.dueDate));
    setInvoices(prev =>
        prev.map(i =>
        i.id === inv.id
            ? { ...i, status: 'open', paidAt: null, paidTs: toPaidTs(null), daysLeft: newDaysLeft }
            : i
        )
    );

    try {
        const headers = await getAuthHeaders();

        // Try PATCH on vendor-scoped route first
        let res = await fetch(`${apiBase}/vendor/${inv.vendorId}/invoice/${inv.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "pending", paidAt: null }),
        });

        if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Mark unpaid failed: ${res.status} ${t}`);
        }
    } catch (e) {
        // rollback on failure
        setInvoices(prev);
        alert((e as any)?.message ?? 'Failed to mark as unpaid');
    }
  }  


  type PatchPayload = Partial<{
    invoiceNumber: string;
    date: string | null;
    dueDate: string | null;
    subtotal: number | null;
    totalAmount: number | null;
    paymentTerms: string | null;
    earlyPayDiscount: number | null;
  }>;

  async function saveEdit(invId: string, vendorId: string, patch: PatchPayload) {
    // optimistic
    const prev = invoices;
    setInvoices(prev => prev.map(i => i.id === invId ? {
      ...i,
      invoiceNumber: patch.invoiceNumber ?? i.invoiceNumber,
      date: patch.date ?? i.date,
      dueDate: patch.dueDate ?? i.dueDate,
      subtotal: patch.subtotal ?? i.subtotal,
      totalAmount: patch.totalAmount ?? i.totalAmount,
      paymentTerms: patch.paymentTerms ?? i.paymentTerms,
      earlyPayDiscount: patch.earlyPayDiscount ?? i.earlyPayDiscount,
      dueTs: toTs(patch.dueDate ?? i.dueDate),
      daysLeft: daysFromToday(toTs(patch.dueDate ?? i.dueDate)),
    } : i));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBase}/vendor/${vendorId}/invoice/${invId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
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
    // optimistic
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

  /* ========================= UI ========================= */

  // gates
  if (!isLoaded) {
    return <div className="grid h-dvh place-items-center text-[var(--text)]">Loading…</div>;
  }
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
    <div className="min-h-dvh overflow-x-hidden">
      <div className="grid md:grid-cols-[16rem_1fr]">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="min-w-0 flex flex-col">
          <Header
            optimizationMode={mode}
            onModeChange={setMode}
            onOpenSidebar={() => setMobileOpen(true)}
          />

          <main className="space-y-4 p-4 md:p-6">
            {/* Title + Tabs + Search */}
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold">Payments</h1>
                <span className="text-xs text-[var(--subtext)]">
                  {tab === 'open' ? 'Due soonest first' : 'Most recently paid first'}
                </span>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1">
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${tab === 'open' ? 'bg-black/20' : 'hover:bg-black/10'}`}
                    onClick={() => setTab('open')}
                  >
                    Open
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${tab === 'history' ? 'bg-black/20' : 'hover:bg-black/10'}`}
                    onClick={() => setTab('history')}
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

            {/* MOBILE: cards */}
            {!loading && !err && (
              <div className="space-y-3 md:hidden">
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-[var(--subtext)]">
                    No invoices match “{query}”.
                  </div>
                ) : (
                  filtered.map((inv) => {
                    const overdue = inv.daysLeft !== null && inv.daysLeft < 0 && !isPaid(inv);
                    const dueSoon = inv.daysLeft !== null && inv.daysLeft <= 7 && inv.daysLeft >= 0 && !isPaid(inv);
                    const displayVendor =
                      (inv.vendorId ? vendorNameMap[inv.vendorId] : null) ??
                      inv.vendorName ??
                      inv.vendorId ??
                      '—';

                    return (
                      <article key={inv.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm text-[var(--subtext)]">Invoice</div>
                            <div className="break-words text-base font-semibold">
                              {inv.invoiceNumber || '—'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isPaid(inv) ? (
                              <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Paid</span>
                            ) : overdue ? (
                              <span className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300">Overdue</span>
                            ) : dueSoon ? (
                              <span className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs text-yellow-200">Due soon</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="break-words">
                            <span className="text-[var(--subtext)]">Vendor:</span> {displayVendor}{' '}
                            {inv.vendorId ? (
                              <Link
                                href={`/vendors/${inv.vendorId}`}
                                prefetch={false}
                                className="text-[var(--accent)] underline-offset-2 hover:underline"
                              >
                                View
                              </Link>
                            ) : null}
                          </p>
                          <p><span className="text-[var(--subtext)]">Date:</span> {fmtYMD(inv.date)}</p>
                          <p>
                            <span className="text-[var(--subtext)]">Due:</span> {fmtYMD(inv.dueDate)}{' '}
                            {!isPaid(inv) && inv.daysLeft !== null && (
                              <span className="text-[var(--subtext)]">
                                ({inv.daysLeft < 0 ? `${Math.abs(inv.daysLeft)}d overdue` : `${inv.daysLeft}d left`})
                              </span>
                            )}
                          </p>
                          <p><span className="text-[var(--subtext)]">Total:</span> {formatMoney(inv.totalAmount)}</p>
                          {isPaid(inv) && <p><span className="text-[var(--subtext)]">Paid:</span> {fmtYMD(inv.paidAt)}</p>}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!isPaid(inv) ? (
                            <button
                            onClick={() => markAsPaid(inv)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                            >
                            Mark as Paid
                            </button>
                        ) : (
                            <button
                            onClick={() => markAsUnpaid(inv)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                            >
                            Mark as Unpaid
                            </button>
                        )}
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
                    );
                  })
                )}
              </div>
            )}

            {/* DESKTOP: table */}
            {!loading && !err && (
              <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] md:block">
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left">
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Invoice #</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Vendor</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Date</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Due</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Status</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Total</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--subtext)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-6 text-center text-[var(--subtext)]">No invoices match “{query}”.</td></tr>
                      ) : (
                        filtered.map((inv) => {
                          const overdue = inv.daysLeft !== null && inv.daysLeft < 0 && !isPaid(inv);
                          const dueSoon = inv.daysLeft !== null && inv.daysLeft <= 7 && inv.daysLeft >= 0 && !isPaid(inv);
                          const displayVendor =
                            (inv.vendorId ? vendorNameMap[inv.vendorId] : null) ??
                            inv.vendorName ??
                            inv.vendorId ??
                            '—';

                          return (
                            <tr key={inv.id} className="border-b border-[var(--border)]">
                              <td className="px-3 py-3 align-top">{inv.invoiceNumber || '—'}</td>
                              <td className="px-3 py-3 align-top"><div className="break-words">{displayVendor}</div></td>
                              <td className="px-3 py-3 align-top">{fmtYMD(inv.date)}</td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex items-center gap-2">
                                  <span>{fmtYMD(inv.dueDate)}</span>
                                  {!isPaid(inv) && overdue && (
                                    <span className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300">Overdue</span>
                                  )}
                                  {!isPaid(inv) && !overdue && dueSoon && (
                                    <span className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs text-yellow-200">Due soon</span>
                                  )}
                                  {isPaid(inv) && (
                                    <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Paid</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                {isPaid(inv)
                                  ? `Paid ${fmtYMD(inv.paidAt)}`
                                  : inv.daysLeft !== null
                                    ? inv.daysLeft < 0
                                      ? `${Math.abs(inv.daysLeft)} overdue`
                                      : `${inv.daysLeft} days`
                                    : '—'}
                              </td>
                              <td className="px-3 py-3 align-top">{formatMoney(inv.totalAmount)}</td>
                              <td className="px-3 py-3 align-top text-right">
                                <div className="inline-flex flex-wrap gap-2">
                                  {!isPaid(inv) ? (
                                    <button
                                        onClick={() => markAsPaid(inv)}
                                        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                                    >
                                        Mark Paid
                                    </button>
                                    ) : (
                                    <button
                                        onClick={() => markAsUnpaid(inv)}
                                        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                                    >
                                        Mark Unpaid
                                    </button>
                                  )}
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
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer meta */}
            {!loading && !err && (
              <div className="text-xs text-[var(--subtext)]">
                Showing {filtered.length} of {tab === 'open'
                  ? invoices.filter(v => !isPaid(v)).length
                  : invoices.filter(v => isPaid(v)).length
                } invoice{filtered.length === 1 ? '' : 's'}.
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ======= Edit Modal ======= */}
      {editId && (
        <EditInvoiceModal
          key={editId}
          invoice={invoices.find(i => i.id === editId)!}
          onClose={() => setEditId(null)}
          onSave={saveEdit}
        />
      )}

      {/* ======= Delete Confirm ======= */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete invoice?"
          body="This action cannot be undone."
          confirmText="Delete"
          variant="danger"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => deleteInvoice(confirmDeleteId, confirmDeleteVendorId ?? '')}
        />
      )}
    </div>
  );
}

/* ========================= Small modals ========================= */

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
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        {body && <p className="mb-4 text-sm text-[var(--subtext)]">{body}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10">
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
  onSave: (id: string, vendorId: string, patch: {
    invoiceNumber?: string;
    date?: string | null;
    dueDate?: string | null;
    subtotal?: number | null;
    totalAmount?: number | null;
    paymentTerms?: string | null;
    earlyPayDiscount?: number | null;
  }) => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber);
  const [date, setDate] = useState(fmtYMD(invoice.date) === '—' ? '' : fmtYMD(invoice.date));
  const [dueDate, setDueDate] = useState(fmtYMD(invoice.dueDate) === '—' ? '' : fmtYMD(invoice.dueDate));
  const [subtotal, setSubtotal] = useState(invoice.subtotal ?? 0);
  const [totalAmount, setTotalAmount] = useState(invoice.totalAmount ?? 0);
  const [paymentTerms, setPaymentTerms] = useState(invoice.paymentTerms ?? '');
  const [earlyPayDiscount, setEarlyPayDiscount] = useState(invoice.earlyPayDiscount ?? 0);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <h3 className="mb-4 text-lg font-semibold">Edit Invoice</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Invoice #</span>
            <input
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Payment Terms</span>
            <input
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Date (YYYY-MM-DD)</span>
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Due Date (YYYY-MM-DD)</span>
            <input
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Subtotal</span>
            <input
              type="number"
              step="0.01"
              value={subtotal ?? 0}
              onChange={e => setSubtotal(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Total Amount</span>
            <input
              type="number"
              step="0.01"
              value={totalAmount ?? 0}
              onChange={e => setTotalAmount(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-[var(--subtext)]">Early Pay Discount (%)</span>
            <input
              type="number"
              step="0.01"
              value={earlyPayDiscount ?? 0}
              onChange={e => setEarlyPayDiscount(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave(invoice.id, invoice.vendorId ?? '', {
                invoiceNumber,
                paymentTerms,
                date: date || null,
                dueDate: dueDate || null,
                subtotal: toNumber(subtotal),
                totalAmount: toNumber(totalAmount),
                earlyPayDiscount: toNumber(earlyPayDiscount) ?? 0,
              })
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm hover:brightness-110"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
