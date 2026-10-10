"use server";

import {
  deleteBookingIfUnchanged,
  findOverlapping,
  getBooking,
  insertBooking,
  payloadToRow,
  RepoError,
  updateBookingIfUnchanged,
} from "@/lib/bookings-repo";
import { getDb } from "@/lib/supabase/db";
import { ConfigError } from "@/lib/supabase/env";
import type { MutationResult } from "@/lib/types";
import { isUuid, normalizeInput, validateBooking } from "@/lib/validation";

const STALE_MESSAGE =
  "Someone else changed this booking after you opened it. Refresh to load the latest version, then make your change again.";

type Db = ReturnType<typeof getDb>;

async function withDb(run: (db: Db) => Promise<MutationResult>): Promise<MutationResult> {
  try {
    return await run(getDb());
  } catch (error) {
    if (error instanceof ConfigError) {
      return { ok: false, kind: "error", message: "The app isn't connected to Supabase yet." };
    }
    if (error instanceof RepoError) {
      if (error.code === "23514") return { ok: false, kind: "invalid", message: "Some values were rejected. Check the form and try again." };
      if (error.code === "42501")
        return { ok: false, kind: "error", message: "The database doesn't allow this yet. Run the latest SQL migration in Supabase." };
      console.error("Booking mutation failed:", error.code ?? "unknown");
    } else {
      console.error("Booking mutation failed:", error instanceof Error ? error.name : "unknown");
    }
    return { ok: false, kind: "error", message: "Couldn't save right now. Check your connection and try again." };
  }
}

type SaveOptions = { force?: boolean };

export async function createBooking(rawInput: unknown, options: SaveOptions = {}): Promise<MutationResult> {
  return withDb(async (supabase) => {
    const result = validateBooking(normalizeInput(rawInput));
    if (!result.ok) return { ok: false, kind: "invalid", message: "Please fix the highlighted fields.", fieldErrors: result.fieldErrors };

    const payload = result.value;
    if (payload.status !== "cancelled" && !options.force) {
      const overlaps = await findOverlapping(supabase, payload.startAt, payload.endAt);
      if (overlaps.length) return { ok: false, kind: "overlap", overlaps };
    }
    return { ok: true, booking: await insertBooking(supabase, payload) };
  });
}

export async function updateBooking(
  id: unknown,
  expectedUpdatedAt: unknown,
  rawInput: unknown,
  options: SaveOptions = {},
): Promise<MutationResult> {
  return withDb(async (supabase) => {
    if (!isUuid(id) || typeof expectedUpdatedAt !== "string") {
      return { ok: false, kind: "invalid", message: "That booking reference is invalid." };
    }
    const existing = await getBooking(supabase, id);
    if (!existing) return { ok: false, kind: "not_found", message: "That booking no longer exists." };
    if (existing.updatedAt !== expectedUpdatedAt) return { ok: false, kind: "stale", message: STALE_MESSAGE };

    const result = validateBooking(normalizeInput(rawInput));
    if (!result.ok) return { ok: false, kind: "invalid", message: "Please fix the highlighted fields.", fieldErrors: result.fieldErrors };

    const payload = result.value;
    // Only re-check overlaps when the slot or status changed; editing the squad or
    // result of an overlap someone already accepted shouldn't warn again.
    const slotChanged =
      Date.parse(payload.startAt) !== Date.parse(existing.startAt) ||
      Date.parse(payload.endAt) !== Date.parse(existing.endAt) ||
      payload.status !== existing.status;
    if (payload.status !== "cancelled" && slotChanged && !options.force) {
      const overlaps = await findOverlapping(supabase, payload.startAt, payload.endAt, id);
      if (overlaps.length) return { ok: false, kind: "overlap", overlaps };
    }

    const updated = await updateBookingIfUnchanged(supabase, id, expectedUpdatedAt, payloadToRow(payload));
    return updated ? { ok: true, booking: updated } : { ok: false, kind: "stale", message: STALE_MESSAGE };
  });
}

export async function cancelBooking(id: unknown, expectedUpdatedAt: unknown): Promise<MutationResult> {
  return withDb(async (supabase) => {
    if (!isUuid(id) || typeof expectedUpdatedAt !== "string") {
      return { ok: false, kind: "invalid", message: "That booking reference is invalid." };
    }
    const updated = await updateBookingIfUnchanged(supabase, id, expectedUpdatedAt, { status: "cancelled" });
    if (updated) return { ok: true, booking: updated };
    const exists = await getBooking(supabase, id);
    return exists
      ? { ok: false, kind: "stale", message: STALE_MESSAGE }
      : { ok: false, kind: "not_found", message: "That booking no longer exists." };
  });
}

/** Permanently removes a booking, unless someone changed it since it was loaded. */
export async function deleteBooking(id: unknown, expectedUpdatedAt: unknown): Promise<MutationResult> {
  return withDb(async (supabase) => {
    if (!isUuid(id) || typeof expectedUpdatedAt !== "string") {
      return { ok: false, kind: "invalid", message: "That booking reference is invalid." };
    }
    const deleted = await deleteBookingIfUnchanged(supabase, id, expectedUpdatedAt);
    if (deleted) return { ok: true, booking: deleted };
    const exists = await getBooking(supabase, id);
    return exists
      ? { ok: false, kind: "stale", message: STALE_MESSAGE }
      : { ok: false, kind: "not_found", message: "That booking was already deleted." };
  });
}
