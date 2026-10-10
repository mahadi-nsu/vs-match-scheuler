import type { Booking } from "./types.ts";

type Slot = Pick<Booking, "startAt" | "endAt" | "status"> & { id?: string };

/**
 * Half-open intervals: a slot ending at 8:00 and one starting at 8:00 do not overlap.
 * Cancelled bookings never overlap anything.
 */
export function overlaps(a: Slot, b: Slot): boolean {
  if (a.status === "cancelled" || b.status === "cancelled") return false;
  return Date.parse(a.startAt) < Date.parse(b.endAt) && Date.parse(b.startAt) < Date.parse(a.endAt);
}

export function findOverlaps<T extends Slot>(candidate: Slot, bookings: T[]): T[] {
  return bookings.filter((b) => b.id !== candidate.id && overlaps(candidate, b));
}

const byStart = (a: Booking, b: Booking) => Date.parse(a.startAt) - Date.parse(b.startAt);

/** A booking is past once its end time has passed. That says nothing about whether it was played. */
export const isPast = (b: Booking, now: number) => Date.parse(b.endAt) <= now;

export function splitBookings(bookings: Booking[], now: number) {
  const upcoming: Booking[] = [];
  const past: Booking[] = [];
  const cancelled: Booking[] = [];
  for (const b of bookings) {
    if (b.status === "cancelled") cancelled.push(b);
    else if (isPast(b, now)) past.push(b);
    else upcoming.push(b);
  }
  upcoming.sort(byStart);
  past.sort((a, b) => byStart(b, a));
  cancelled.sort((a, b) => byStart(b, a));
  return { upcoming, past, cancelled };
}

/** Earliest confirmed booking that hasn't ended yet. */
export function nextConfirmedMatch(bookings: Booking[], now: number): Booking | null {
  return (
    bookings
      .filter((b) => b.status === "confirmed" && !isPast(b, now))
      .sort(byStart)[0] ?? null
  );
}

export const isLive = (b: Booking, now: number) =>
  b.status !== "cancelled" && Date.parse(b.startAt) <= now && now < Date.parse(b.endAt);

const amountFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
export const formatBdt = (amount: number) => `৳${amountFormatter.format(amount)}`;

export function amountDue(b: Pick<Booking, "totalCost" | "advancePaid">): number | null {
  if (b.totalCost === null) return null;
  return Math.max(0, b.totalCost - (b.advancePaid ?? 0));
}

export const STATUS_LABEL = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" } as const;

export type Outcome = "win" | "draw" | "loss";

export function matchOutcome(b: Pick<Booking, "ourScore" | "opponentScore">): Outcome | null {
  if (b.ourScore === null || b.opponentScore === null) return null;
  if (b.ourScore > b.opponentScore) return "win";
  return b.ourScore === b.opponentScore ? "draw" : "loss";
}

export const OUTCOME_LABEL = { win: "Win", draw: "Draw", loss: "Loss" } as const;

/** Every player name used before, most frequent first, for quick-add suggestions. */
export function knownPlayers(bookings: Booking[]): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const b of bookings) {
    for (const name of b.squad) {
      const key = name.toLowerCase();
      const entry = counts.get(key) ?? { name, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((e) => e.name);
}

/** "Khelar FC vs Gulshan Strikers", "vs Gulshan Strikers", "Khelar FC vs TBC" or "Opponent TBC". */
export function matchTitle(b: Pick<Booking, "teamName" | "opponentName">): string {
  if (b.teamName) return `${b.teamName} vs ${b.opponentName ?? "TBC"}`;
  return b.opponentName ? `vs ${b.opponentName}` : "Opponent TBC";
}
