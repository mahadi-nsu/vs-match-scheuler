export const STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof STATUSES)[number];

/** A booking as the app sees it. Timestamps are UTC ISO strings. */
export type Booking = {
  id: string;
  venueName: string;
  startAt: string;
  endAt: string;
  bookedBy: string;
  status: BookingStatus;
  opponentName: string | null;
  totalCost: number | null;
  advancePaid: number | null;
  contactPhone: string | null;
  mapUrl: string | null;
  notes: string | null;
  /** Player names, in the order they were added. */
  squad: string[];
  ourScore: number | null;
  opponentScore: number | null;
  createdAt: string;
  updatedAt: string;
};

/** Raw form values. Date/times are Asia/Dhaka wall-clock strings: "YYYY-MM-DDTHH:mm". */
export type BookingFormInput = {
  venueName: string;
  startLocal: string;
  endLocal: string;
  bookedBy: string;
  status: string;
  opponentName: string;
  totalCost: string;
  advancePaid: string;
  contactPhone: string;
  mapUrl: string;
  notes: string;
  squad: string[];
  ourScore: string;
  opponentScore: string;
};

/** Validated values ready to store. */
export type BookingPayload = {
  venueName: string;
  startAt: string;
  endAt: string;
  bookedBy: string;
  status: BookingStatus;
  opponentName: string | null;
  totalCost: number | null;
  advancePaid: number | null;
  contactPhone: string | null;
  mapUrl: string | null;
  notes: string | null;
  squad: string[];
  ourScore: number | null;
  opponentScore: number | null;
};

export type FieldErrors = Partial<Record<keyof BookingFormInput, string>>;

export type OverlapSummary = Pick<
  Booking,
  "id" | "venueName" | "startAt" | "endAt" | "status" | "opponentName"
>;

export type MutationResult =
  | { ok: true; booking: Booking }
  | { ok: false; kind: "invalid"; message: string; fieldErrors?: FieldErrors }
  | { ok: false; kind: "overlap"; overlaps: OverlapSummary[] }
  | { ok: false; kind: "stale"; message: string }
  | { ok: false; kind: "not_found"; message: string }
  | { ok: false; kind: "error"; message: string };
