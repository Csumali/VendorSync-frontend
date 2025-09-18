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
    <main className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">VendorSync</h1>
        <div className="flex items-center gap-3">
          <SignedOut>
            <Link className="underline" href="/sign-in">Sign in</Link>
            <Link className="underline" href="/sign-up">Sign up</Link>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <section className="max-w-4xl mx-auto text-center space-y-8">
        <div>
          <h2 className="text-4xl font-bold mb-4">AI Contract & Vendor Management</h2>
          <p className="text-lg" style={{ color: 'var(--subtext)' }}>
            Automatically track vendor contracts, payment terms, price changes, and compliance requirements for small businesses.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <SignedOut>
            <Link 
              href="/sign-up" 
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ 
                background: 'var(--accent)', 
                color: '#051320',
                textDecoration: 'none'
              }}
            >
              Get Started
            </Link>
            <Link 
              href="/sign-in" 
              className="px-6 py-3 rounded-lg font-semibold border"
              style={{ 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
          </SignedOut>
          <SignedIn>
            <Link 
              href="/dashboard" 
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ 
                background: 'var(--accent)', 
                color: '#051320',
                textDecoration: 'none'
              }}
            >
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </section>
    </main>
  );
}
