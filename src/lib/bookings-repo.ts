import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, BookingPayload, BookingStatus, OverlapSummary } from "./types";

// "*" (not a column list) so reads keep working while a new optional column's
// migration hasn't been run yet; toBooking() picks out the fields it knows.
const COLUMNS = "*";

type Row = {
  id: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  booked_by: string;
  status: BookingStatus;
  /** Optional until the team_name migration has run. */
  team_name?: string | null;
  opponent_name: string | null;
  total_cost: number | string | null;
  advance_paid: number | string | null;
  contact_phone: string | null;
  map_url: string | null;
  notes: string | null;
  squad: string[] | null;
  our_score: number | null;
  opponent_score: number | null;
  created_at: string;
  updated_at: string;
};

const toNumber = (v: number | string | null) => (v === null ? null : Number(v));

/** Normalise to a full ISO UTC string for the client; keeps the raw value for concurrency checks. */
function toBooking(row: Row): Booking {
  return {
    id: row.id,
    venueName: row.venue_name,
    startAt: new Date(row.start_at).toISOString(),
    endAt: new Date(row.end_at).toISOString(),
    bookedBy: row.booked_by,
    status: row.status,
    teamName: row.team_name ?? null,
    opponentName: row.opponent_name,
    totalCost: toNumber(row.total_cost),
    advancePaid: toNumber(row.advance_paid),
    contactPhone: row.contact_phone,
    mapUrl: row.map_url,
    notes: row.notes,
    squad: row.squad ?? [],
    ourScore: row.our_score,
    opponentScore: row.opponent_score,
    createdAt: row.created_at,
    // Microsecond precision matters: this is compared verbatim on update.
    updatedAt: row.updated_at,
  };
}

function toRow(p: BookingPayload) {
  return {
    venue_name: p.venueName,
    start_at: p.startAt,
    end_at: p.endAt,
    booked_by: p.bookedBy,
    status: p.status,
    team_name: p.teamName,
    opponent_name: p.opponentName,
    total_cost: p.totalCost,
    advance_paid: p.advancePaid,
    contact_phone: p.contactPhone,
    map_url: p.mapUrl,
    notes: p.notes,
    squad: p.squad,
    our_score: p.ourScore,
    opponent_score: p.opponentScore,
  };
}

export class RepoError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new RepoError(error.message, error.code);
}

export async function listBookings(db: SupabaseClient): Promise<Booking[]> {
  const { data, error } = await db.from("bookings").select(COLUMNS).order("start_at", { ascending: true }).limit(2000);
  if (error) fail(error);
  return (data as Row[]).map(toBooking);
}

export async function getBooking(db: SupabaseClient, id: string): Promise<Booking | null> {
  const { data, error } = await db.from("bookings").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? toBooking(data as Row) : null;
}

/** Non-cancelled bookings whose [start, end) intersects the given slot. Back-to-back is fine. */
export async function findOverlapping(
  db: SupabaseClient,
  startAt: string,
  endAt: string,
  excludeId?: string,
): Promise<OverlapSummary[]> {
  let query = db
    .from("bookings")
    .select("id, venue_name, start_at, end_at, status, opponent_name")
    .neq("status", "cancelled")
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .order("start_at")
    .limit(10);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) fail(error);
  return (data as Row[]).map((r) => ({
    id: r.id,
    venueName: r.venue_name,
    startAt: new Date(r.start_at).toISOString(),
    endAt: new Date(r.end_at).toISOString(),
    status: r.status,
    opponentName: r.opponent_name,
  }));
}

export async function insertBooking(db: SupabaseClient, payload: BookingPayload): Promise<Booking> {
  const { data, error } = await db.from("bookings").insert(toRow(payload)).select(COLUMNS).single();
  if (error) fail(error);
  return toBooking(data as Row);
}

/**
 * Optimistic concurrency: the row is only written if updated_at still matches
 * what the user loaded. Returns null when someone else changed (or removed) it.
 */
export async function updateBookingIfUnchanged(
  db: SupabaseClient,
  id: string,
  expectedUpdatedAt: string,
  changes: Partial<ReturnType<typeof toRow>>,
): Promise<Booking | null> {
  const { data, error } = await db
    .from("bookings")
    .update(changes)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toBooking(data as Row) : null;
}

export async function deleteBookingIfUnchanged(
  db: SupabaseClient,
  id: string,
  expectedUpdatedAt: string,
): Promise<Booking | null> {
  const { data, error } = await db
    .from("bookings")
    .delete()
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toBooking(data as Row) : null;
}

export const payloadToRow = toRow;
