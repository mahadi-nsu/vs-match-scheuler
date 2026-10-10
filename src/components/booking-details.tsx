"use client";

import { useState, type ReactNode } from "react";
import { amountDue, findOverlaps, formatBdt, isLive, isPast, matchOutcome, matchTitle, OUTCOME_LABEL } from "@/lib/bookings";
import {
  calendarDaysUntil,
  formatDate,
  formatDuration,
  formatStamp,
  formatTimeRange,
  formatWeekday,
  TIME_ZONE,
} from "@/lib/time";
import type { Booking } from "@/lib/types";
import {
  AlertIcon,
  BanIcon,
  ClockIcon,
  CopyIcon,
  EditIcon,
  MoneyIcon,
  NoteIcon,
  PhoneIcon,
  PinIcon,
  TrashIcon,
  UserIcon,
} from "./icons";
import { OutcomeBadge } from "./outcome-badge";
import { StatusBadge } from "./status-badge";

type Props = {
  booking: Booking;
  allBookings: Booking[];
  now: number;
  /** Which destructive action is in flight, if any. */
  busy: "cancel" | "delete" | null;
  onEdit: () => void;
  onCancel: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCopy: () => void;
};

function when(b: Booking, now: number) {
  if (b.status === "cancelled") return "Cancelled";
  if (isLive(b, now)) return "Playing now";
  if (isPast(b, now)) return "Slot time has passed";
  const days = calendarDaysUntil(b.startAt, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days to go`;
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-pitch-300">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-[0.9375rem] text-slate-100">{children}</dd>
      </div>
    </div>
  );
}

export function BookingDetails({
  booking: b,
  allBookings,
  now,
  busy,
  onEdit,
  onCancel,
  onDelete,
  onCopy,
}: Props) {
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const clashes = findOverlaps(b, allBookings);
  const due = amountDue(b);
  const outcome = matchOutcome(b);
  const needsResult = !outcome && b.status !== "cancelled" && isPast(b, now);

  return (
    <article aria-labelledby={`booking-${b.id}-title`} className="space-y-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={b.status} />
          <span className="text-sm font-semibold text-pitch-200">{when(b, now)}</span>
        </div>
        <h3 id={`booking-${b.id}-title`} className="font-display mt-2 text-3xl font-bold uppercase leading-tight">
          {matchTitle(b)}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-slate-200">
          <PinIcon width={16} height={16} className="shrink-0 text-pitch-300" />
          {b.venueName}
        </p>
      </header>

      <div className="rounded-2xl bg-navy-950/60 p-4 ring-1 ring-white/10">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">{formatWeekday(b.startAt)}</p>
        <p className="font-display text-2xl font-bold">{formatDate(b.startAt)}</p>
        <p className="mt-1 text-lg font-semibold text-pitch-200">{formatTimeRange(b.startAt, b.endAt)}</p>
        <p className="text-sm text-slate-300">
          {formatDuration(b.startAt, b.endAt)} · {TIME_ZONE} time
        </p>
      </div>

      {outcome && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-navy-950/60 p-4 ring-1 ring-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Result</p>
            <p className="font-display text-4xl font-extrabold leading-none" aria-label={`${b.ourScore} to ${b.opponentScore}, ${OUTCOME_LABEL[outcome]}`}>
              {b.ourScore} <span className="text-slate-500">–</span> {b.opponentScore}
            </p>
            <p className="mt-1 text-xs text-slate-400">{b.teamName ?? "Us"} – {b.opponentName ?? "Opponent"}</p>
          </div>
          <OutcomeBadge outcome={outcome} large />
        </div>
      )}

      {needsResult && (
        <button type="button" onClick={onEdit} className="btn-secondary w-full border-dashed border-pitch-400/50 text-pitch-100">
          <EditIcon width={18} height={18} /> Add result &amp; squad
        </button>
      )}

      {clashes.length > 0 && (
        <div role="note" className="flex gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertIcon className="mt-0.5 shrink-0" width={18} height={18} />
          <div>
            <p className="font-semibold">Overlaps with {clashes.length === 1 ? "another booking" : `${clashes.length} bookings`}</p>
            <ul className="mt-1 space-y-0.5 text-amber-100/90">
              {clashes.map((c) => (
                <li key={c.id}>
                  {c.venueName} · {formatDate(c.startAt)}, {formatTimeRange(c.startAt, c.endAt)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <dl className="divide-y divide-white/8">
        <Row icon={<UserIcon width={18} height={18} />} label="Booked by">
          {b.bookedBy}
        </Row>
        {(b.totalCost !== null || b.advancePaid !== null) && (
          <Row icon={<MoneyIcon width={18} height={18} />} label="Payment (BDT)">
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              {b.totalCost !== null && (
                <span>
                  Total <strong>{formatBdt(b.totalCost)}</strong>
                </span>
              )}
              {b.advancePaid !== null && (
                <span>
                  Advance <strong>{formatBdt(b.advancePaid)}</strong>
                </span>
              )}
              {due !== null && b.advancePaid !== null && (
                <span className={due > 0 ? "text-amber-200" : "text-pitch-200"}>
                  Due <strong>{formatBdt(due)}</strong>
                </span>
              )}
            </span>
          </Row>
        )}
        {b.contactPhone && (
          <Row icon={<PhoneIcon width={18} height={18} />} label="Contact">
            <a className="inline-flex min-h-11 items-center font-semibold text-pitch-200 underline-offset-2 hover:underline" href={`tel:${b.contactPhone.replace(/[^\d+]/g, "")}`}>
              {b.contactPhone}
            </a>
          </Row>
        )}
        {b.mapUrl && (
          <Row icon={<PinIcon width={18} height={18} />} label="Location">
            <a
              className="inline-flex min-h-11 items-center font-semibold text-pitch-200 underline-offset-2 hover:underline"
              href={b.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps ↗
            </a>
          </Row>
        )}
        {b.squad.length > 0 && (
          <Row icon={<UserIcon width={18} height={18} />} label={`Squad (${b.squad.length})`}>
            <ol className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
              {b.squad.map((name, i) => (
                <li key={name} className="flex gap-1.5">
                  <span className="w-5 text-right text-sm text-slate-500">{i + 1}.</span>
                  <span className="min-w-0 truncate">{name}</span>
                </li>
              ))}
            </ol>
          </Row>
        )}
        {b.notes && (
          <Row icon={<NoteIcon width={18} height={18} />} label="Notes">
            <span className="whitespace-pre-wrap">{b.notes}</span>
          </Row>
        )}
        <Row icon={<ClockIcon width={18} height={18} />} label="Record">
          <span className="text-sm text-slate-300">
            Added {formatStamp(b.createdAt)} · Updated {formatStamp(b.updatedAt)}
          </span>
        </Row>
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={onCopy}>
          <CopyIcon width={18} height={18} /> Copy details
        </button>
        <button type="button" className="btn-secondary" onClick={onEdit}>
          <EditIcon width={18} height={18} /> {b.status === "cancelled" ? "Edit / restore" : "Edit"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 p-3">
        {confirming ? (
          <div role="group" aria-label={confirming === "cancel" ? "Confirm cancellation" : "Confirm deletion"} className="space-y-2">
            <p className="text-sm text-slate-200">
              {confirming === "cancel"
                ? "Cancel this booking? It moves to the Cancelled tab and can be restored later."
                : "Delete this booking permanently? This can't be undone."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-danger flex-1"
                disabled={busy !== null}
                onClick={async () => {
                  await (confirming === "cancel" ? onCancel() : onDelete());
                  setConfirming(null);
                }}
              >
                {confirming === "cancel"
                  ? busy === "cancel" ? "Cancelling…" : "Yes, cancel it"
                  : busy === "delete" ? "Deleting…" : "Yes, delete it"}
              </button>
              <button type="button" className="btn-secondary flex-1" disabled={busy !== null} onClick={() => setConfirming(null)}>
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 ${b.status !== "cancelled" ? "grid-cols-2" : ""}`}>
            {b.status !== "cancelled" && (
              <button type="button" className="btn-danger" onClick={() => setConfirming("cancel")}>
                <BanIcon width={18} height={18} /> Cancel
              </button>
            )}
            <button type="button" className="btn-danger" onClick={() => setConfirming("delete")}>
              <TrashIcon width={18} height={18} /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
