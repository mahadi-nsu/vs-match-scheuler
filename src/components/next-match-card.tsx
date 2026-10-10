"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { isLive } from "@/lib/bookings";
import { calendarDaysUntil, formatDate, formatDayMonthYear, formatTimeRange, formatWeekday } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { Football } from "./football";
import { CalendarIcon, ClockIcon, PinIcon, PlusIcon, UserIcon } from "./icons";

type Props = {
  booking: Booking | null;
  pendingCount: number;
  now: number;
  onOpen: (booking: Booking) => void;
  onAdd: () => void;
};

/** Re-renders every second so the scoreboard countdown ticks. */
function useTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar-day wording (Asia/Dhaka), independent of the exact countdown. */
function dayLabel(days: number) {
  if (days <= 0) return "Match day";
  if (days === 1) return "Tomorrow";
  return `${days} days to go`;
}

const SPARKS = [
  { x: "8%", d: "0s", s: "5s" },
  { x: "22%", d: "1.6s", s: "6s" },
  { x: "37%", d: "3.1s", s: "5.5s" },
  { x: "55%", d: "0.8s", s: "6.5s" },
  { x: "68%", d: "2.4s", s: "5s" },
  { x: "81%", d: "4s", s: "6s" },
  { x: "93%", d: "1.2s", s: "5.8s" },
];

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="hero-tile">
      {/* key change remounts the digit so it plays the tick animation */}
      <span
        key={value}
        className="hero-tick font-display text-[1.75rem] font-extrabold leading-none tabular-nums min-[360px]:text-3xl sm:text-4xl"
      >
        {pad(value)}
      </span>
      <span className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-pitch-200/80">{label}</span>
    </div>
  );
}

export function NextMatchCard({ booking, pendingCount, now, onOpen, onAdd }: Props) {
  const tick = useTick();

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

  const current = Math.max(now, tick);
  const live = isLive(booking, current);
  const days = calendarDaysUntil(booking.startAt, current);
  const state = live ? "live" : days <= 0 ? "today" : "upcoming";
  const left = splitDuration((live ? Date.parse(booking.endAt) : Date.parse(booking.startAt)) - current);
  const opponent = booking.opponentName ?? (booking.teamName ? "TBC" : "Opponent TBC");
  const team = booking.teamName;

  return (
    <section aria-labelledby="next-match-heading" className="animate-rise">
      <div className="hero-frame" data-state={state}>
        <div className="hero-inner px-4 pb-12 pt-4 min-[360px]:px-5 sm:px-6 sm:pt-5">
          {/* Atmosphere: mowing stripes, pitch lines, floodlights, rising sparks */}
          <div className="hero-stripes" aria-hidden="true" />
          <svg className="hero-markings" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <circle cx="200" cy="100" r="62" stroke="currentColor" strokeWidth="2" />
            <line x1="200" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="2" />
          </svg>
          <div className="hero-beam hero-beam-left" aria-hidden="true" />
          <div className="hero-beam hero-beam-right" aria-hidden="true" />
          {SPARKS.map((p, i) => (
            <span
              key={i}
              className="hero-spark"
              aria-hidden="true"
              style={{ "--x": p.x, "--d": p.d, "--s": p.s } as CSSProperties}
            />
          ))}

          <div className="relative z-[1]">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="next-match-heading"
                className="font-display flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-pitch-200"
              >
                <span
                  className={`live-dot inline-block h-2 w-2 rounded-full ${live ? "bg-rose-400 text-rose-400" : "bg-pitch-400 text-pitch-400"}`}
                />
                Next match
              </h2>
              <span className={`hero-chip ${state === "live" ? "hero-chip-live" : state === "today" ? "hero-chip-today" : ""}`}>
                {live ? "● Live" : dayLabel(days)}
              </span>
            </div>

            {team ? (
              /* Face-off: our team · VS · opponent (stacked on phones, one row on wider screens) */
              <p className="hero-faceoff mt-3">
                <span className="hero-team font-display line-clamp-2 min-w-0 break-words">{team}</span>
                <span className="hero-vs hero-vs-center font-display">VS</span>
                <span className="hero-shimmer hero-opponent font-display line-clamp-2 min-w-0 break-words">{opponent}</span>
              </p>
            ) : (
              <p className="mt-3 flex items-start gap-2.5">
                <span className="hero-vs font-display">VS</span>
                <span className="hero-shimmer font-display line-clamp-2 min-w-0 break-words text-[1.875rem] font-extrabold uppercase leading-[1.05] min-[360px]:text-4xl sm:text-5xl">
                  {opponent}
                </span>
              </p>
            )}

            <div className="mt-4" aria-hidden="true">
              <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
                {live ? "Full time in" : "Kick-off in"}
              </p>
              <div className="grid grid-cols-4 gap-1.5 min-[360px]:gap-2 sm:max-w-md">
                <Tile value={left.days} label="Days" />
                <Tile value={left.hours} label="Hrs" />
                <Tile value={left.minutes} label="Min" />
                <Tile value={left.seconds} label="Sec" />
              </div>
            </div>

            <dl className="mt-4 flex flex-wrap gap-2 text-sm">
              <div className="hero-info">
                <dt className="sr-only">Date</dt>
                <CalendarIcon className="shrink-0 text-pitch-300" width={16} height={16} />
                <dd>
                  <span className="font-semibold">{formatWeekday(booking.startAt)}</span>, {formatDayMonthYear(booking.startAt)}
                </dd>
              </div>
              <div className="hero-info">
                <dt className="sr-only">Time</dt>
                <ClockIcon className="shrink-0 text-pitch-300" width={16} height={16} />
                <dd className="font-semibold">{formatTimeRange(booking.startAt, booking.endAt)}</dd>
              </div>
              <div className="hero-info min-w-0 max-w-full">
                <dt className="sr-only">Venue</dt>
                <PinIcon className="shrink-0 text-pitch-300" width={16} height={16} />
                <dd className="line-clamp-2 min-w-0 break-words font-medium">{booking.venueName}</dd>
              </div>
              <div className="hero-info">
                <dt className="sr-only">Booked by</dt>
                <UserIcon className="shrink-0 text-pitch-300" width={16} height={16} />
                <dd>
                  <span aria-hidden="true">Booked by </span>
                  <span className="font-semibold">{booking.bookedBy}</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Ball dribbling along the touchline */}
          <div className="hero-ball-track" aria-hidden="true">
            <div className="hero-ball">
              <Football className="h-full w-full" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpen(booking)}
            className="absolute inset-0 z-[2] rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-pitch-300"
            aria-label={`Next match: ${team ? `${team} ` : ""}versus ${opponent} at ${booking.venueName}, ${formatDate(booking.startAt)}, ${formatTimeRange(booking.startAt, booking.endAt)}. ${live ? "Playing now" : dayLabel(days)}. Booked by ${booking.bookedBy}. Open details.`}
          />
        </div>
      </div>
    </section>
  );
}
