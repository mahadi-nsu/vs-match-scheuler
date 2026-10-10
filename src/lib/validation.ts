import { BOOKERS } from "../config/bookers.ts";
import { dhakaLocalToDate } from "./time.ts";
import {
  STATUSES,
  type BookingFormInput,
  type BookingPayload,
  type BookingStatus,
  type FieldErrors,
} from "./types.ts";

export const LIMITS = {
  venueName: 120,
  bookedBy: 60,
  opponentName: 120,
  contactPhone: 40,
  mapUrl: 2048,
  notes: 2000,
  maxAmount: 10_000_000,
  squadSize: 30,
  playerName: 60,
  maxScore: 99,
} as const;

const FIELDS: Exclude<keyof BookingFormInput, "squad">[] = [
  "venueName",
  "startLocal",
  "endLocal",
  "bookedBy",
  "status",
  "opponentName",
  "totalCost",
  "advancePaid",
  "contactPhone",
  "mapUrl",
  "notes",
  "ourScore",
  "opponentScore",
];

/** Coerce untrusted input (e.g. a Server Action argument) into string fields. */
export function normalizeInput(raw: unknown): BookingFormInput {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as BookingFormInput;
  for (const key of FIELDS) {
    const value = source[key];
    out[key] = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  }
  out.squad = Array.isArray(source.squad) ? source.squad.filter((p): p is string => typeof p === "string") : [];
  return out;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{5,40}$/;

function parseAmount(raw: string, label: string, errors: FieldErrors, key: "totalCost" | "advancePaid") {
  const value = raw.replace(/,/g, "").trim();
  if (!value) return null;
  if (value.startsWith("-")) {
    errors[key] = `${label} can't be negative.`;
    return null;
  }
  if (!AMOUNT_PATTERN.test(value)) {
    errors[key] = `${label} must be a number with up to 2 decimals.`;
    return null;
  }
  const amount = Number(value);
  if (amount > LIMITS.maxAmount) {
    errors[key] = `${label} looks too large.`;
    return null;
  }
  return amount;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Trim, collapse spaces and drop case-insensitive duplicates, keeping the first spelling. */
export function cleanSquad(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

function parseScore(raw: string, errors: FieldErrors, key: "ourScore" | "opponentScore") {
  const value = raw.trim();
  if (!value) return null;
  if (!/^\d{1,2}$/.test(value)) {
    errors[key] = `Use a whole number from 0 to ${LIMITS.maxScore}.`;
    return null;
  }
  return Number(value);
}

const optional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export type ValidationResult =
  | { ok: true; value: BookingPayload }
  | { ok: false; fieldErrors: FieldErrors };

/** Shared by the form (instant feedback) and the server (authoritative check). */
export function validateBooking(input: BookingFormInput): ValidationResult {
  const errors: FieldErrors = {};

  const venueName = input.venueName.trim();
  if (!venueName) errors.venueName = "Venue is required.";
  else if (venueName.length > LIMITS.venueName) errors.venueName = `Keep it under ${LIMITS.venueName} characters.`;

  const start = input.startLocal ? dhakaLocalToDate(input.startLocal) : null;
  const end = input.endLocal ? dhakaLocalToDate(input.endLocal) : null;
  if (!input.startLocal) errors.startLocal = "Start date and time are required.";
  else if (!start) errors.startLocal = "Enter a valid start date and time.";
  if (!input.endLocal) errors.endLocal = "End date and time are required.";
  else if (!end) errors.endLocal = "Enter a valid end date and time.";
  if (start && end && end.getTime() <= start.getTime()) errors.endLocal = "End must be after the start.";
  if (start && end && end.getTime() - start.getTime() > 24 * 3_600_000)
    errors.endLocal = "A slot can't be longer than 24 hours.";

  // Any name is allowed. Known names are matched case-insensitively ("mahadi" -> "Mahadi")
  // so the same person isn't stored under different spellings.
  const rawBooker = input.bookedBy.trim().replace(/\s+/g, " ");
  const bookedBy = BOOKERS.find((name) => name.toLowerCase() === rawBooker.toLowerCase()) ?? rawBooker;
  if (!bookedBy) errors.bookedBy = "Add who booked it.";
  else if (bookedBy.length > LIMITS.bookedBy) errors.bookedBy = `Keep it under ${LIMITS.bookedBy} characters.`;

  const status = input.status as BookingStatus;
  if (!STATUSES.includes(status)) errors.status = "Choose a status.";

  const opponentName = optional(input.opponentName);
  if (opponentName && opponentName.length > LIMITS.opponentName)
    errors.opponentName = `Keep it under ${LIMITS.opponentName} characters.`;

  const totalCost = parseAmount(input.totalCost, "Total cost", errors, "totalCost");
  const advancePaid = parseAmount(input.advancePaid, "Advance", errors, "advancePaid");
  if (totalCost !== null && advancePaid !== null && advancePaid > totalCost)
    errors.advancePaid = "Advance can't be more than the total cost.";

  const contactPhone = optional(input.contactPhone);
  if (contactPhone && !PHONE_PATTERN.test(contactPhone))
    errors.contactPhone = "Use digits, spaces, +, - or brackets only.";

  const mapUrl = optional(input.mapUrl);
  if (mapUrl && (mapUrl.length > LIMITS.mapUrl || !isHttpUrl(mapUrl)))
    errors.mapUrl = "Paste a full link starting with http:// or https://";

  const notes = optional(input.notes);
  if (notes && notes.length > LIMITS.notes) errors.notes = `Keep notes under ${LIMITS.notes} characters.`;

  const squad = cleanSquad(input.squad);
  if (squad.length > LIMITS.squadSize) errors.squad = `A squad can have up to ${LIMITS.squadSize} players.`;
  else if (squad.some((p) => p.length > LIMITS.playerName))
    errors.squad = `Keep each player name under ${LIMITS.playerName} characters.`;

  const ourScore = parseScore(input.ourScore, errors, "ourScore");
  const opponentScore = parseScore(input.opponentScore, errors, "opponentScore");
  if (!errors.ourScore && !errors.opponentScore && (ourScore === null) !== (opponentScore === null)) {
    errors[ourScore === null ? "ourScore" : "opponentScore"] = "Enter both scores, or leave both empty.";
  }

  if (Object.keys(errors).length > 0 || !start || !end) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    value: {
      venueName,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      bookedBy,
      status,
      opponentName,
      totalCost,
      advancePaid,
      contactPhone,
      mapUrl,
      notes,
      squad,
      ourScore,
      opponentScore,
    },
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_PATTERN.test(value);
