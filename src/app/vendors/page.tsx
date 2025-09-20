'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, SignIn } from '@clerk/nextjs';

import styles from '../dashboard/dashboard.module.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { OptimizationMode } from '@/types';

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

export default function VendorsPage() {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();

  // Layout state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<OptimizationMode>('Balanced');

  // Data state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const upstream =
    process.env.NEXT_PUBLIC_VENDORS_API_URL;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const token = await getToken();

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
        console.log('Fetched vendors:', data);
        if (cancelled) return;

        const list: Vendor[] = Array.isArray(data) ? data : data?.vendors ?? [];
        setVendors(list);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load vendors.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, upstream]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(v =>
      [v.name, v.email ?? '', v.phone ?? '', v.address ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [vendors, query]);

  // Auth / loading gates
   if (!isLoaded) {
    return (
      <div className={styles.app}>
        <div className="grid h-dvh place-items-center text-[var(--text)]">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-dvh grid place-items-center p-6">
        <div className="mb-4 text-center space-y-2">
          <h1 className="text-xl font-semibold">Vendors</h1>
          <p className="text-[var(--subtext)]">Please sign in to view vendors</p>
        </div>
        <SignIn />
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="grid md:grid-cols-[16rem_1fr]">
        {/* Sidebar (desktop rail + mobile drawer) */}
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        {/* Content column */}
        <div className="flex min-w-0 flex-col">
          <Header
            optimizationMode={mode}
            onModeChange={setMode}
            onOpenSidebar={() => setMobileOpen(true)}
          />

          <main className="p-4 md:p-6 space-y-4">
            {/* Header row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-[22px] font-bold">Vendors</h1>
              <div className="flex w-full gap-3 sm:w-auto">
                <input
                  placeholder="Search vendors (name, email, address)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--subtext)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:min-w-72"
                />
              </div>
            </div>

            {/* Loading / Error */}
            {loading && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-[var(--subtext)]">
                Loading vendors…
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
                    No vendors match “{query}”.
                  </div>
                ) : (
                  filtered.map((v) => (
                    <article
                      key={v.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4"
                    >
                      <div className="mb-2">
                        <h2 className="text-base font-semibold">{v.name}</h2>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="break-words">
                          <span className="text-[var(--subtext)]">Email:</span> {v.email ?? '—'}
                        </p>
                        <p>
                          <span className="text-[var(--subtext)]">Phone:</span> {v.phone ?? '—'}
                        </p>
                        <p className="break-words">
                          <span className="text-[var(--subtext)]">Address:</span> {v.address ?? '—'}
                        </p>
                        <p>
                          <span className="text-[var(--subtext)]">Created:</span>{' '}
                          {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                        </p>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Link
                          href={`/vendors/${v.id}`}
                          prefetch={false}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                        >
                          View
                        </Link>
                      </div>
                    </article>
                  ))
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
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">
                          Vendor
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">
                          Contact
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">
                          Address
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">
                          Created
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--subtext)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-[var(--subtext)]">
                            No vendors match “{query}”.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((v) => (
                          <tr key={v.id} className="border-b border-[var(--border)]">
                            <td className="px-3 py-3">
                              <div className="font-semibold">{v.name}</div>
                            </td>
                            <td className="px-3 py-3">
                              <div>{v.email ?? '—'}</div>
                              <div className="text-xs text-[var(--subtext)]">{v.phone ?? '—'}</div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="break-words text-[var(--subtext)]">{v.address ?? '—'}</div>
                            </td>
                            <td className="px-3 py-3">
                              {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <Link
                                href={`/vendors/${v.id}`}
                                prefetch={false}
                                className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-black/10"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer meta */}
            {!loading && !err && (
              <div className="text-xs text-[var(--subtext)]">
                Showing {filtered.length} of {vendors.length} vendor{vendors.length === 1 ? '' : 's'}.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}