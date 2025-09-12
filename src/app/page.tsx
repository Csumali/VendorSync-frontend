import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="p-6 space-y-6">
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

      <section className="space-x-4">
        <Link className="underline" href="/dashboard">Go to dashboard</Link>
      </section>
    </main>
  );
}
