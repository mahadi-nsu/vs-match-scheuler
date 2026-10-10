"use client";

import type { CSSProperties } from "react";
import { isLive, matchOutcome, matchTitle, overlaps } from "@/lib/bookings";
import { formatDay, formatMonth, formatShortWeekday, formatTimeRange, relativeDayLabel } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { AlertIcon, PinIcon } from "./icons";
import { OutcomeBadge } from "./outcome-badge";
import { StatusBadge } from "./status-badge";

type Props = {
  bookings: Booking[];
  allBookings: Booking[];
  selectedId: string | null;
  now: number;
  showRelative: boolean;
  onSelect: (booking: Booking) => void;
};

export function BookingList({ bookings, allBookings, selectedId, now, showRelative, onSelect }: Props) {
  return (
    <ul className="space-y-2.5">
      {bookings.map((b, i) => {
        const selected = b.id === selectedId;
        const clash = allBookings.some((o) => o.id !== b.id && overlaps(b, o));
        const live = isLive(b, now);
        const outcome = matchOutcome(b);
        return (
          <li key={b.id} className="stagger-item" style={{ "--i": Math.min(i, 12) } as CSSProperties}>
            <button
              type="button"
              onClick={() => onSelect(b)}
              aria-current={selected ? "true" : undefined}
              className={`flex w-full items-stretch gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-300 ${
                selected
                  ? "border-pitch-400/60 bg-pitch-500/10 shadow-[inset_3px_0_0_var(--color-pitch-400)]"
                  : "border-white/8 bg-navy-850/80 hover:border-white/20 hover:bg-navy-800"
              } ${b.status === "cancelled" ? "opacity-80" : ""}`}
            >
              <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-950/70 py-1.5 ring-1 ring-white/10">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-pitch-300">
                  {formatShortWeekday(b.startAt)}
                </span>
                <span className="font-display text-2xl font-bold leading-none">{formatDay(b.startAt)}</span>
                <span className="text-[0.6875rem] uppercase text-slate-300">{formatMonth(b.startAt)}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`line-clamp-2 min-w-0 break-words font-semibold ${b.status === "cancelled" ? "line-through decoration-rose-300/60" : ""}`}>
                    {matchTitle(b)}
                  </p>
                  {outcome ? (
                    <OutcomeBadge outcome={outcome} score={`${b.ourScore}–${b.opponentScore}`} />
                  ) : (
                    <StatusBadge status={b.status} />
                  )}
                </div>
                <p className="mt-0.5 text-sm font-medium text-slate-100">{formatTimeRange(b.startAt, b.endAt)}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-300">
                  <PinIcon width={14} height={14} className="shrink-0" />
                  <span className="truncate">{b.venueName}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                  {live ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-200">
                      <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-400 text-rose-400" /> Live now
                    </span>
                  ) : (
                    showRelative && <span className="font-semibold text-pitch-200">{relativeDayLabel(b.startAt, now)}</span>
                  )}
                  <span>by {b.bookedBy}</span>
                  {b.squad.length > 0 && <span>👥 {b.squad.length}</span>}
                  {clash && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
                      <AlertIcon width={13} height={13} /> Overlaps
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
