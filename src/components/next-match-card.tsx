"use client";

import { isLive } from "@/lib/bookings";
import { calendarDaysUntil, formatDate, formatDayMonthYear, formatTimeRange, formatWeekday } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { Football } from "./football";
import { ClockIcon, PinIcon, PlusIcon, UserIcon } from "./icons";

type Props = {
  booking: Booking | null;
  pendingCount: number;
  now: number;
  onOpen: (booking: Booking) => void;
  onAdd: () => void;
};

function countdown(booking: Booking, now: number) {
  if (isLive(booking, now)) return { big: "LIVE", small: "playing now" };
  const days = calendarDaysUntil(booking.startAt, now);
  if (days <= 0) return { big: "TODAY", small: "match day" };
  if (days === 1) return { big: "1", small: "day to go" };
  return { big: String(days), small: "days to go" };
}

export function NextMatchCard({ booking, pendingCount, now, onOpen, onAdd }: Props) {
  if (!booking) {
    return (
      <section aria-labelledby="next-match-heading" className="card-surface animate-rise relative overflow-hidden rounded-3xl p-5">
        <h2 id="next-match-heading" className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-pitch-300">
          Next match
        </h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="ball-roll-idle h-12 w-12 shrink-0">
            <Football className="h-full w-full" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold">No confirmed match yet</p>
            <p className="text-sm text-slate-300">
              {pendingCount > 0
                ? `${pendingCount} pending booking${pendingCount === 1 ? "" : "s"} waiting to be confirmed.`
                : "Add the next slot once it's booked with the venue."}
            </p>
          </div>
          <button type="button" className="btn-primary hidden sm:inline-flex" onClick={onAdd}>
            <PlusIcon /> Add
          </button>
        </div>
      </section>
    );
  }

  const live = isLive(booking, now);
  const { big, small } = countdown(booking, now);

  return (
    <section aria-labelledby="next-match-heading" className="animate-rise">
      <button
        type="button"
        onClick={() => onOpen(booking)}
        className="group relative block w-full overflow-hidden rounded-3xl border border-pitch-400/30 bg-gradient-to-br from-pitch-700/60 via-navy-800 to-navy-900 p-5 text-left shadow-[0_20px_50px_-25px_rgb(34_197_94/0.7)] transition hover:border-pitch-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-300"
        aria-label={`Next match: ${booking.opponentName ? `versus ${booking.opponentName}, ` : ""}${booking.venueName}, ${formatDate(booking.startAt)}, ${formatTimeRange(booking.startAt, booking.endAt)}. ${small === "playing now" ? "Playing now" : `${big} ${small}`}. Open details.`}
      >
        {/* centre circle marking */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-2 border-white/10"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-0 h-full w-px bg-white/10" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="next-match-heading"
              className="font-display flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-pitch-200"
            >
              {live && <span className="live-dot inline-block h-2 w-2 rounded-full bg-rose-400 text-rose-400" />}
              Next match
            </h2>
            <p className="font-display mt-1 line-clamp-2 break-words text-3xl font-bold uppercase leading-tight sm:text-4xl">
              {booking.opponentName ? `vs ${booking.opponentName}` : "Opponent TBC"}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-navy-950/70 px-2.5 py-2 text-center ring-1 ring-white/10 min-[360px]:px-3">
            <p className={`font-display text-3xl font-extrabold leading-none ${live ? "text-rose-300" : "text-white"}`}>{big}</p>
            <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-300">{small}</p>
          </div>
        </div>

        <dl className="relative mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Date</dt>
            <ClockIcon className="shrink-0 text-pitch-300" width={16} height={16} />
            <dd>
              <span className="font-semibold">{formatWeekday(booking.startAt)}</span>, {formatDayMonthYear(booking.startAt)}
              <br />
              <span className="text-slate-200">{formatTimeRange(booking.startAt, booking.endAt)}</span>
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <dt className="sr-only">Venue</dt>
            <PinIcon className="shrink-0 text-pitch-300" width={16} height={16} />
            <dd className="line-clamp-2 min-w-0 break-words font-medium">{booking.venueName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Booked by</dt>
            <UserIcon className="shrink-0 text-pitch-300" width={16} height={16} />
            <dd>
              <span aria-hidden="true">Booked by </span>
              <span className="font-semibold">{booking.bookedBy}</span>
            </dd>
          </div>
        </dl>
      </button>
    </section>
  );
}
