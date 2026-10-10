import { connection } from "next/server";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { BouncingBall } from "@/components/motion";
import { readSupabaseEnv } from "@/lib/supabase/env";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <div className="pitch-backdrop" aria-hidden="true" />
          <BouncingBall label="Warming up…" />
        </main>
      }
    >
      <DashboardGate />
    </Suspense>
  );
}

async function DashboardGate() {
  await connection(); // check config per request, not at build time
  return readSupabaseEnv() ? <Dashboard /> : <NotConfigured />;
}

function NotConfigured() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="pitch-backdrop" aria-hidden="true" />
      <div role="alert" className="card-surface max-w-md rounded-3xl p-6">
        <h1 className="font-display text-2xl font-bold uppercase">Not connected to Supabase</h1>
        <p className="mt-2 text-sm text-slate-300">
          Set <code>SUPABASE_URL</code> and <code>SUPABASE_PUBLISHABLE_KEY</code> in the server
          environment (see <code>.env.example</code>), then restart the app. No bookings are shown until then.
        </p>
      </div>
    </main>
  );
}
