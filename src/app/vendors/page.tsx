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

  // Edit/Delete state
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');
  const upstream = API_BASE ? `${API_BASE}/vendor` : '';

  async function getAuthHeaders() {
    const token = await getToken();
    return {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit;
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!upstream) {
          throw new Error('Vendors API URL is not defined. Set NEXT_PUBLIC_API_BASE in .env.local');
        }

        const headers = await getAuthHeaders();
        const res = await fetch(upstream, { method: 'GET', headers, cache: 'no-store' });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Fetch failed (${res.status}) ${text ? `- ${text}` : ''}`.trim());
        }

        const data = await res.json();
        const list: Vendor[] = Array.isArray(data) ? data : data?.vendors ?? [];

        if (!cancelled) setVendors(list);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load vendors.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, upstream]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      [v.name, v.email ?? '', v.phone ?? '', v.address ?? ''].join(' ').toLowerCase().includes(q),
    );
  }, [vendors, query]);

  // ---- Actions ----
  async function saveEditVendor(vendorId: string, patch: Partial<Pick<Vendor, 'name' | 'email' | 'phone' | 'address'>>) {
    const prev = vendors;
    // optimistic
    setVendors((cur) => cur.map((v) => (v.id === vendorId ? { ...v, ...patch } as Vendor : v)));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/vendor/${vendorId}`, {
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
      setVendors(prev); // rollback
      alert((e as any)?.message ?? 'Failed to update vendor');
    }
  }

  async function deleteVendor(vendorId: string) {
    const prev = vendors;
    // optimistic
    setVendors((cur) => cur.filter((v) => v.id !== vendorId));
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/vendor/${vendorId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Delete failed: ${res.status} ${t}`);
      }
      setConfirmDeleteId(null);
    } catch (e) {
      setVendors(prev); // rollback
      alert((e as any)?.message ?? 'Failed to delete vendor');
    }
  }

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

          <main className="space-y-4 p-4 md:p-6">
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
                    <article key={v.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
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

                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => setEditId(v.id)}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/10"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(v.id)}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
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
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Vendor</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Contact</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Address</th>
                        <th className="px-3 py-3 text-xs font-semibold text-[var(--subtext)]">Created</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--subtext)]">Actions</th>
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
                              <div className="inline-flex flex-wrap gap-2">
                                <button
                                  onClick={() => setEditId(v.id)}
                                  className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-black/10"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(v.id)}
                                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-red-300 hover:bg-red-500/10"
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

      {/* ======= Edit Vendor Modal ======= */}
      {editId && (
        <EditVendorModal
          key={editId}
          vendor={vendors.find((v) => v.id === editId)!}
          onClose={() => setEditId(null)}
          onSave={(patch) => saveEditVendor(editId, patch)}
        />
      )}

      {/* ======= Delete Confirm ======= */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete vendor?"
          body="This will remove the vendor and may affect related analytics. This action cannot be undone."
          confirmText="Delete"
          variant="danger"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => deleteVendor(confirmDeleteId)}
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

function EditVendorModal({
  vendor,
  onClose,
  onSave,
}: {
  vendor: Vendor;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Vendor, 'name' | 'email' | 'phone' | 'address'>>) => void;
}) {
  const [name, setName] = useState(vendor.name ?? '');
  const [email, setEmail] = useState(vendor.email ?? '');
  const [phone, setPhone] = useState(vendor.phone ?? '');
  const [address, setAddress] = useState(vendor.address ?? '');

  const E164 = /^\+[1-9]\d{7,14}$/; // E.164: + then 8–15 digits total, first digit 1–9

  const [phoneError, setPhoneError] = useState<string | null>(null);

  function validatePhone(val: string): string | null {
    const trimmed = val.trim();
    if (!trimmed) return null; // empty allowed
    return E164.test(trimmed) ? null : 'Phone must be E.164, e.g. +15555550123';
  }

  function onPhoneChange(v: string) {
    setPhone(v);
    setPhoneError(validatePhone(v));
  }

  function handleSave() {
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    onSave({
      name: name || undefined,
      email: email || null,
      phone: phone.trim() ? phone.trim() : null,
      address: address?.trim() ? address.trim() : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl p-4">
        <h3 className="mb-4 text-lg font-semibold">Edit Vendor</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--subtext)]">Phone (E.164)</span>
            <input
              type="tel"
              placeholder="+15555550123"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              className={`rounded-lg border px-3 py-2 bg-[var(--card-2)] ${
                phoneError ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)]'
              }`}
              aria-invalid={!!phoneError}
              aria-describedby="phone-error"
            />
            {phoneError && (
              <span id="phone-error" className="text-xs text-red-400">
                {phoneError}
              </span>
            )}
          </label>

          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-[var(--subtext)]">Address</span>
            <textarea
              value={address ?? ''}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
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
            disabled={!!phoneError}
            className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

