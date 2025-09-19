'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">VendorSync</h1>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50">
        <div className="mx-auto flex max-w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="group inline-flex items-center gap-2" aria-label="VendorSync Home">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 ring-1 ring-sky-400/30">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-90">
                <path d="M5 17L10 7l2 4 7-4-5 10-2-4-7 4z" fill="currentColor" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white">VendorSync</span>
          </Link>

          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                Sign up
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-4xl rounded-full bg-sky-500/20 blur-3xl" />
        <div className="mx-auto grid max-w-full grid-cols-1 items-center gap-6 sm:gap-8 px-4 sm:px-6 lg:px-8 pb-16 pt-14 lg:grid-cols-2">
          <div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              AI Contract & Vendor Management
            </h1>
            <p className="mt-6 max-w-prose text-lg sm:text-xl text-pretty text-slate-300">
              Automatically track vendor <span className="text-slate-100">contracts</span>,{" "}
              <span className="text-slate-100">payment terms</span>,{" "}
              <span className="text-slate-100">price changes</span>, and{" "}
              <span className="text-slate-100">compliance requirements</span> for small businesses. Scan documents with OCR and get intelligent alerts that
              protect cash flow and reduce risk.
            </p>

            {/* Primary CTAs */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  Get Started
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/40 px-6 py-4 text-base font-semibold text-slate-200 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                >
                  Create an account
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
            </div>

            {/* Micro trust bullets */}
            <ul className="mt-8 space-y-3 text-base text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Capture early-pay discounts and avoid late fees
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Centralize contracts with OCR + term extraction
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Compliance reminders before renewals & expirations
              </li>
            </ul>
          </div>

          {/* Visual: payment calendar / analytics teaser */}
          <div className="mx-auto w-full max-w-md lg:max-w-lg rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-2xl ring-1 ring-white/5">
            <div className="rounded-xl bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-300">Savings Projection</div>
                <div className="text-sm text-emerald-400">+3.2k/yr potential</div>
              </div>
              <div className="mt-3 h-24 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900">
                <svg viewBox="0 0 300 100" className="h-full w-full opacity-70">
                  <polyline
                    fill="none"
                    stroke="url(#g)"
                    strokeWidth="3"
                    points="0,90 40,82 70,86 110,60 150,68 180,40 220,55 260,22 300,30"
                  />
                  <defs>
                    <linearGradient id="g" x1="0" x2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { kpi: "Net 30", sub: "due soon" },
                  { kpi: "2/10", sub: "discounts" },
                  { kpi: "5", sub: "vendors" },
                ].map((x) => (
                  <div key={x.kpi} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="text-base font-bold text-slate-100">{x.kpi}</div>
                    <div className="text-xs text-slate-400">{x.sub}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">Demo-ready with fake data</span>
                <Link href="/sign-up" className="text-sm font-semibold text-sky-400 hover:text-sky-300">
                  Try it →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t border-slate-800/60 bg-slate-950/40">
        <div className="mx-auto grid max-w-full grid-cols-1 gap-6 px-4 sm:px-6 lg:px-8 py-10 md:grid-cols-3">
          {[
            {
              title: "Contract Intelligence",
              desc:
                "Scan and digitize agreements with OCR. Auto-extract Net 30/15, renewal dates, discounts and penalties.",
            },
            {
              title: "Payment Optimization",
              desc:
                "AI suggests pay-now vs pay-later timing to maximize cash flow and capture early-pay discounts.",
            },
            {
              title: "Compliance & Alerts",
              desc:
                "Stay ahead of expirations for insurance, licenses and certificates. Avoid auto-renew traps.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 ring-1 ring-white/5">
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60">
        <div className="mx-auto flex max-w-full flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-8 sm:flex-row">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} VendorSync — Built for small business productivity</p>
          <div className="flex items-center gap-4 text-sm">
            <SignedOut>
              <Link href="/sign-up" className="text-sky-400 hover:text-sky-300">
                Create account
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-sky-400 hover:text-sky-300">
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </footer>
    </main>
  );
}
