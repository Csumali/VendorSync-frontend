'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { useEffect, useMemo } from 'react';

type NavItem = { icon: string; label: string; href?: string };

const NAV: NavItem[] = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '🤝', label: 'Vendors', href: '/vendors' },
  { icon: '📄', label: 'Contracts' },
  { icon: '💸', label: 'Payments' },
  { icon: '🔔', label: 'Alerts' },
  { icon: '🛡️', label: 'Compliance' },
  { icon: '📈', label: 'Analytics' },
  { icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  // Lock background scroll when the drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => { document.documentElement.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const userInitial = useMemo(() => {
    const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
    return (user?.firstName?.[0] || email[0] || 'U').toUpperCase();
  }, [user]);

  const isActive = (href?: string) =>
    !!href && (pathname === href || pathname.startsWith(href + '/'));

  const Rail = (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[linear-gradient(180deg,#0d141d,#0a1017_60%)]">
      {/* Brand */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="grid h-9 w-9 place-items-center rounded-xl font-extrabold text-[#051320] shadow-[inset_0_0_20px_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.45)]"
          style={{ background: 'radial-gradient(80% 80% at 30% 30%, var(--accent) 0%, #4ea9ff 40%, #19476b 100%)' }}
        >
          VS
        </div>
        <div className="truncate">
          <h1 className="m-0 text-[18px] leading-none">VendorSync</h1>
          <small className="text-[var(--subtext)]">Contract & Vendor Intelligence</small>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              onClick={onClose}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={[
                'flex items-center gap-2 rounded-xl px-3 py-2 transition',
                isActive(item.href)
                  ? 'border border-[var(--border)] bg-[var(--card)]'
                  : 'border border-transparent hover:bg-[var(--muted)]',
              ].join(' ')}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ) : (
            <span
              key={item.label}
              className="cursor-not-allowed select-none rounded-xl px-3 py-2 text-[var(--text)] opacity-70"
              title="Coming soon"
              aria-disabled="true"
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </span>
          )
        )}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-[var(--border)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-[var(--accent)] text-[#051320]">
              {user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.fullName ?? 'User'} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">{userInitial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text)]">
                {user.fullName || user.username || user.emailAddresses[0]?.emailAddress}
              </div>
              <div className="truncate text-xs text-[var(--subtext)]">
                {user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>
          <SignOutButton>
            <button className="w-full rounded-md border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm transition hover:brightness-110 hover:bg-[var(--danger)] hover:border-[rgba(255,123,123,0.3)]">
              🚪 Sign Out
            </button>
          </SignOutButton>
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop rail */}
      <div className="sticky top-0 hidden h-dvh md:block">{Rail}</div>

      {/* Mobile drawer (above header) */}
      <div
        className={[
          'fixed inset-0 z-[80] md:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
      >
        {/* Backdrop */}
        <div
          className={[
            'fixed inset-0 bg-black/60 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={[
            'fixed left-0 top-0 h-full w-72 max-w-[80%] shadow-xl transition-transform',
            'overflow-y-auto',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          {Rail}
        </div>
      </div>
    </>
  );
}
