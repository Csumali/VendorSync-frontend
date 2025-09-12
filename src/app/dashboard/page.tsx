// src/app/dashboard/page.tsx
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();
  return (
    <main className="p-8 space-y-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome!</p>
    </main>
  );
}
