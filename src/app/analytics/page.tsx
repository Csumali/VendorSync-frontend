'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth, SignIn } from '@clerk/nextjs';
import Link from 'next/link';

import Sidebar from '@/components/Sidebar';
import Header, { type OptimizationMode } from '@/components/Header';

/* ========================= Types ========================= */

type VendorRow = { id: string; name?: string | null; email?: string | null };

type SeasonalMonth = {
  total_amount: number;
  invoice_count: number;
  percentage_of_total: number;
};

type PerfRaw = {
  id: string;
  totalSpend: string | number;
  avgInvoiceAmount: string | number;
  invoiceCount: number;
  paymentConsistency: string | number;
  spendTrend: 'increasing' | 'stable' | 'decreasing' | string;
  seasonalPatterns: Record<string, SeasonalMonth>;
  complianceScore: string | number;
  analysisDate: string;
  analysisPeriodDays: number;
};

type PerfView = {
  id: string;
  totalSpend: number;
  avgInvoiceAmount: number;
  invoiceCount: number;
  paymentConsistency: number;
  spendTrend: string;
  seasonal: Array<{ month: string; total: number; count: number; pct: number }>;
  topMonth: { month: string; pct: number } | null;
  complianceScore: number;
  analysisDate: string;
  analysisPeriodDays: number;
};

type Insight = {
  insightType: string;
  priority: 'low' | 'medium' | 'high' | string;
  title: string;
  description?: string;
  impact?: string;
  actionItems?: string[];
  confidence?: number;
  financialImpact?: { type?: string; estimatedAmount?: number; timeframe?: string };
  riskFactors?: { level?: string; description?: string };
};

/* ========================= Helpers ========================= */

function getApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_BASE;
  if (direct) return direct.replace(/\/$/, '');
  const vendorsUrl = process.env.NEXT_PUBLIC_VENDORS_API_URL;
  if (vendorsUrl) return vendorsUrl.replace(/\/vendor.*$/i, '').replace(/\/$/, '');
  throw new Error('API base not configured. Set NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_VENDORS_API_URL in .env.local');
}

function toNumber(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const n = Number(String(val ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function formatMoney(val: unknown): string {
  const n = toNumber(val);
  return `$${n.toFixed(2)}`;
}
function fmtYMD(input?: string | null): string {
  if (!input) return '—';
  const s = String(input);
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s.includes('T') ? s.split('T')[0] : s;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function normalizePerf(x: PerfRaw): PerfView {
  const seasonalArr: PerfView['seasonal'] = Object.entries(x.seasonalPatterns || {}).map(
    ([rawMonth, m]) => ({
      month: rawMonth.trim(),
      total: toNumber(m.total_amount),
      count: toNumber(m.invoice_count),
      pct: toNumber(m.percentage_of_total),
    })
  );
  const top = seasonalArr.length
    ? seasonalArr.reduce((a, b) => (b.pct > a.pct ? b : a))
    : null;

  return {
    id: x.id,
    totalSpend: toNumber(x.totalSpend),
    avgInvoiceAmount: toNumber(x.avgInvoiceAmount),
    invoiceCount: x.invoiceCount ?? 0,
    paymentConsistency: toNumber(x.paymentConsistency),
    spendTrend: x.spendTrend || '—',
    seasonal: seasonalArr,
    topMonth: top ? { month: top.month, pct: top.pct } : null,
    complianceScore: toNumber(x.complianceScore),
    analysisDate: x.analysisDate,
    analysisPeriodDays: x.analysisPeriodDays,
  };
}
function badgeClassForTrend(trend: string) {
  switch (trend) {
    case 'increasing': return 'bg-emerald-500/20 text-emerald-300';
    case 'decreasing': return 'bg-red-500/20 text-red-300';
    default: return 'bg-zinc-500/20 text-zinc-300';
  }
}
function badgeClassForPriority(p: string) {
  switch (p) {
    case 'high': return 'bg-red-500/20 text-red-300';
    case 'medium': return 'bg-yellow-500/20 text-yellow-200';
    default: return 'bg-emerald-500/20 text-emerald-300';
  }
}

/* ========================= Page ========================= */

const INSIGHTS_PER_PAGE = 2;

export default function VendorAnalyticsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // layout
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<OptimizationMode>('Balanced');

  // vendor selection
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const selectedVendor = useMemo(
    () => vendors.find(v => v.id === selectedVendorId),
    [vendors, selectedVendorId]
  );

  // data
  const [perf, setPerf] = useState<PerfView | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsPage, setInsightsPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const apiBase = getApiBase();

  /* ------------ load vendors for selector ------------ */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const headers: HeadersInit = {
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(`${apiBase}/vendor`, { headers, cache: 'no-store' });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`Fetch vendors failed ${res.status} ${t}`);
        }
        const json = await res.json();
        const rows: VendorRow[] = Array.isArray(json) ? json : json?.vendors ?? [];
        if (!cancelled) {
          setVendors(rows);
          if (rows[0]?.id) setSelectedVendorId(rows[0].id);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load vendors.');
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, apiBase]);

  /* ------------ load vendor performance & insights ------------ */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !selectedVendorId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const token = await getToken();
        const headers: HeadersInit = {
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // PERF: /vendor/:vendorId/performance
        const perfRes = await fetch(`${apiBase}/vendor/${selectedVendorId}/performance`, {
          headers,
          cache: 'no-store',
        });
        if (!perfRes.ok) {
          const t = await perfRes.text().catch(() => '');
          throw new Error(`Performance fetch failed ${perfRes.status} ${t}`);
        }
        const perfJson: PerfRaw = await perfRes.json();
        const perfView = normalizePerf(perfJson);

        // INSIGHTS:
        // try /vendor/:id/performance/ai-insights -> /vendor/:id/ai-insights -> /ai-insights?vendorId= -> global /ai-insights
        let insightsItems: Insight[] = [];

        let insightsRes = await fetch(`${apiBase}/vendor/${selectedVendorId}/performance/ai-insights`, { headers, cache: 'no-store' });
        if (!insightsRes.ok) {
          insightsRes = await fetch(`${apiBase}/vendor/${selectedVendorId}/ai-insights`, { headers, cache: 'no-store' });
        }
        if (!insightsRes.ok) {
          insightsRes = await fetch(`${apiBase}/ai-insights?vendorId=${encodeURIComponent(selectedVendorId)}`, { headers, cache: 'no-store' });
        }
        if (insightsRes.ok) {
          const raw = await insightsRes.json();
          insightsItems = Array.isArray(raw) ? raw : (raw?.aiInsights ?? []);
        } else {
          const allRes = await fetch(`${apiBase}/ai-insights`, { headers, cache: 'no-store' });
          if (allRes.ok) {
            const all = await allRes.json();
            if (Array.isArray(all)) {
              const group = all.find((g: any) => g?.vendor?.id === selectedVendorId);
              insightsItems = group?.aiInsights ?? [];
            }
          }
        }

        if (!cancelled) {
          setPerf(perfView);
          setInsights(insightsItems);
          setInsightsPage(1); // reset page when vendor/insights change
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? 'Failed to load vendor analytics.');
          setPerf(null);
          setInsights([]);
          setInsightsPage(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, selectedVendorId, getToken, apiBase]);

  /* --------------------------- UI --------------------------- */

  if (!isLoaded) return <div className="grid h-dvh place-items-center">Loading…</div>;
  if (!isSignedIn) {
    return (
      <main className="min-h-dvh grid place-items-center p-6">
        <div className="mb-4 text-center space-y-2">
          <h1 className="text-xl font-semibold">Vendor Analytics</h1>
          <p className="text-[var(--subtext)]">Please sign in to view analytics</p>
        </div>
        <SignIn />
      </main>
    );
  }

  const displayName =
    selectedVendor?.name ||
    selectedVendor?.email ||
    (selectedVendorId ? `Vendor ${selectedVendorId.slice(0, 8)}…` : '—');

  // pagination calcs
  const totalPages = Math.max(1, Math.ceil(insights.length / INSIGHTS_PER_PAGE));
  const clampedPage = Math.min(insightsPage, totalPages);
  const startIdx = (clampedPage - 1) * INSIGHTS_PER_PAGE;
  const currentInsights = insights.slice(startIdx, startIdx + INSIGHTS_PER_PAGE);

  return (
    <div className="min-h-[100svh] bg-[var(--app)]">
      <div className="grid md:grid-cols-[16rem_1fr] items-stretch">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="min-w-0 flex flex-col">
          <Header
            optimizationMode={mode}
            onModeChange={setMode}
            onOpenSidebar={() => setMobileOpen(true)}
          />

          <main className="space-y-4 p-4 md:p-6">
            {/* Title + selector */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-bold">Vendor Analytics</h1>
                <div className="text-xs text-[var(--subtext)]">Performance & AI insights per vendor</div>
              </div>

              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2
                             text-sm text-black focus:outline-none focus:ring-2 focus:ring-black
                             sm:min-w-64 [color-scheme:light]
                             [&>option]:bg-white [&>option]:text-black"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name || v.email || v.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading / Error */}
            {loading && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-[var(--subtext)]">
                Loading {displayName}…
              </div>
            )}
            {!loading && err && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-red-400">
                Error: {err}
              </div>
            )}

            {/* ======== PERFORMANCE ======== */}
            {!loading && !err && perf && (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{displayName}</div>
                    <div className="text-xs text-[var(--subtext)]">
                      Analyzed {fmtYMD(perf.analysisDate)} · {perf.analysisPeriodDays} days
                    </div>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs ${badgeClassForTrend(perf.spendTrend)}`}>
                    {perf.spendTrend}
                  </span>
                </div>

                {/* KPI grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-3">
                    <div className="text-xs text-[var(--subtext)]">Total Spend</div>
                    <div className="mt-1 text-xl font-semibold">{formatMoney(perf.totalSpend)}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-3">
                    <div className="text-xs text-[var(--subtext)]">Avg Invoice</div>
                    <div className="mt-1 text-xl font-semibold">{formatMoney(perf.avgInvoiceAmount)}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-3">
                    <div className="text-xs text-[var(--subtext)]">Invoices</div>
                    <div className="mt-1 text-xl font-semibold">{perf.invoiceCount}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-3">
                    <div className="text-xs text-[var(--subtext)]">Consistency</div>
                    <div className="mt-1 text-xl font-semibold">{perf.paymentConsistency}%</div>
                  </div>
                </div>

                {/* Seasonal breakdown */}
                <div className="mt-4">
                  <div className="mb-2 text-sm font-semibold">Seasonal Breakdown</div>
                  {perf.seasonal.length === 0 ? (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--subtext)]">
                      No seasonal pattern data.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {perf.seasonal.map(s => (
                        <div key={s.month}>
                          <div className="flex items-center justify-between text-sm">
                            <div>{s.month} · {s.count} inv</div>
                            <div className="text-[var(--subtext)]">{s.pct}%</div>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/20">
                            <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, s.pct)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ======== AI INSIGHTS (2 per page) ======== */}
            {!loading && !err && (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-base font-semibold">AI Insights</div>
                  {insights.length > 0 && (
                    <div className="text-xs text-[var(--subtext)]">
                      Showing {startIdx + 1}–{Math.min(startIdx + INSIGHTS_PER_PAGE, insights.length)} of {insights.length}
                    </div>
                  )}
                </div>

                {insights.length === 0 ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-4 text-center text-[var(--subtext)]">
                    No insights for this vendor.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      {currentInsights.map((it, idx) => (
                        <article key={`${clampedPage}-${idx}`} className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="font-semibold">{it.title}</div>
                            <div className="flex items-center gap-2">
                              {it.insightType && (
                                <span className="rounded-md bg-black/20 px-2 py-1 text-xs">{it.insightType}</span>
                              )}
                              {it.priority && (
                                <span className={`rounded-md px-2 py-1 text-xs ${badgeClassForPriority(it.priority)}`}>
                                  {it.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          {it.description && (
                            <p className="mb-2 whitespace-pre-wrap text-sm text-[var(--subtext)]">{it.description}</p>
                          )}
                          {it.impact && (
                            <p className="mb-2 text-sm"><span className="text-[var(--subtext)]">Impact:</span> {it.impact}</p>
                          )}
                          {it.financialImpact?.estimatedAmount != null && (
                            <p className="mb-2 text-sm">
                              <span className="text-[var(--subtext)]">Estimated:</span>{' '}
                              {formatMoney(it.financialImpact.estimatedAmount)} {it.financialImpact.timeframe ? `(${it.financialImpact.timeframe})` : ''}
                            </p>
                          )}
                          {it.confidence != null && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-xs text-[var(--subtext)]">
                                <span>Confidence</span>
                                <span>{Math.round(it.confidence * 100)}%</span>
                              </div>
                              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/20">
                                <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, it.confidence * 100))}%` }} />
                              </div>
                            </div>
                          )}
                          {it.riskFactors?.level && (
                            <p className="mb-2 text-sm">
                              <span className="text-[var(--subtext)]">Risk:</span>{' '}
                              <span className="rounded-md bg-black/20 px-2 py-0.5 text-xs">{it.riskFactors.level}</span>{' '}
                              {it.riskFactors.description && <span className="text-[var(--subtext)]">– {it.riskFactors.description}</span>}
                            </p>
                          )}
                          {it.actionItems?.length ? (
                            <div className="mt-2">
                              <div className="mb-1 text-xs text-[var(--subtext)]">Action Items</div>
                              <ul className="list-disc pl-5 text-sm">
                                {it.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                              </ul>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setInsightsPage(p => Math.max(1, p - 1))}
                            disabled={clampedPage <= 1}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50 hover:bg-black/10"
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() => setInsightsPage(p => Math.min(totalPages, p + 1))}
                            disabled={clampedPage >= totalPages}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50 hover:bg-black/10"
                          >
                            Next →
                          </button>
                        </div>

                        {/* Page dots */}
                        <div className="flex flex-wrap items-center gap-2">
                          {Array.from({ length: totalPages }).map((_, i) => {
                            const active = i + 1 === clampedPage;
                            return (
                              <button
                                key={i}
                                onClick={() => setInsightsPage(i + 1)}
                                aria-label={`Go to page ${i + 1}`}
                                className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--accent)]' : 'bg-black/30 hover:bg-black/50'}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
