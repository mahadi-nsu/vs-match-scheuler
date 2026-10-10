/**
 * All booking times are entered and shown in Asia/Dhaka, regardless of the
 * device or server timezone. Conversions go through Intl with an explicit
 * timeZone; nothing here uses the runtime's local zone.
 */
export const TIME_ZONE = "Asia/Dhaka";

const MINUTE = 60_000;
const DAY = 86_400_000;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type WallClock = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallClock(date: Date): WallClock {
  const out: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** Milliseconds Dhaka is ahead of UTC at the given instant. */
function offsetAt(instant: number): number {
  const w = wallClock(new Date(instant));
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-10-11T19:30" (Dhaka wall clock) -> Date, or null if malformed/nonexistent. */
export function dhakaLocalToDate(local: string): Date | null {
  const m = LOCAL_PATTERN.exec(local.trim());
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = asUtc - offsetAt(asUtc);
  const corrected = asUtc - offsetAt(instant);
  if (corrected !== instant) instant = corrected;

  // Round-trip check rejects impossible dates such as 31 Feb.
  return dateToDhakaLocal(new Date(instant)) === `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`
    ? new Date(instant)
    : null;
}

/** Date or ISO string -> "YYYY-MM-DDTHH:mm" in Dhaka (for datetime-local inputs). */
export function dateToDhakaLocal(value: Date | string): string {
  const w = wallClock(typeof value === "string" ? new Date(value) : value);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** "YYYY-MM-DD" of the Dhaka calendar day containing this instant. */
export function dhakaDateKey(value: Date | string | number): string {
  return dateToDhakaLocal(new Date(value)).slice(0, 10);
}

/** Add minutes to a Dhaka wall-clock string. */
export function addMinutesLocal(local: string, minutes: number): string | null {
  const d = dhakaLocalToDate(local);
  return d ? dateToDhakaLocal(new Date(d.getTime() + minutes * MINUTE)) : null;
}

/** Whole Dhaka calendar days from `now` until `start` (0 = today, negative = past). */
export function calendarDaysUntil(start: string | Date, now: number | Date): number {
  const toDayNumber = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / DAY;
  };
  return toDayNumber(dhakaDateKey(start)) - toDayNumber(dhakaDateKey(now));
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dayMonthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "long" });
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const monthFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, month: "short" });
const dayFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric" });
const shortWeekdayFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short" });
const stampFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Sat, 11 Oct 2026" */
export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
/** "11 Oct 2026" */
export const formatDayMonthYear = (iso: string) => dayMonthYearFormatter.format(new Date(iso));
/** "Saturday" */
export const formatWeekday = (iso: string) => weekdayFormatter.format(new Date(iso));
/** "Sat" */
export const formatShortWeekday = (iso: string) => shortWeekdayFormatter.format(new Date(iso));
/** "7:30 PM" */
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso));
/** "Oct" */
export const formatMonth = (iso: string) => monthFormatter.format(new Date(iso));
/** "11" */
export const formatDay = (iso: string) => dayFormatter.format(new Date(iso));
/** "11 Oct, 7:30 pm" */
export const formatStamp = (iso: string) => stampFormatter.format(new Date(iso));

/** "7:30 PM – 9:00 PM", adding the end date if the slot crosses midnight. */
export function formatTimeRange(startIso: string, endIso: string): string {
  const sameDay = dhakaDateKey(startIso) === dhakaDateKey(endIso);
  const end = sameDay ? formatTime(endIso) : `${formatTime(endIso)} (${formatDate(endIso)})`;
  return `${formatTime(startIso)} – ${end}`;
}

/** "1 h 30 min" */
export function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.round((Date.parse(endIso) - Date.parse(startIso)) / MINUTE);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  return h ? `${h} h` : `${m} min`;
}

/** "Today", "Tomorrow", "In 5 days", "Yesterday", "3 days ago" */
export function relativeDayLabel(startIso: string, now: number): string {
  const days = calendarDaysUntil(startIso, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}
