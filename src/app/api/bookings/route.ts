import { connection } from "next/server";
import { listBookings } from "@/lib/bookings-repo";
import { getDb } from "@/lib/supabase/db";
import { ConfigError } from "@/lib/supabase/env";

const noStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  await connection(); // request-time only; never prerendered
  try {
    const bookings = await listBookings(getDb());
    return Response.json({ bookings }, { headers: noStore });
  } catch (error) {
    if (error instanceof ConfigError) {
      return Response.json({ error: "config_missing" }, { status: 503, headers: noStore });
    }
    console.error("Loading bookings failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "load_failed" }, { status: 500, headers: noStore });
  }
}
