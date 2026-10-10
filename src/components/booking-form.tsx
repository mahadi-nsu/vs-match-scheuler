"use client";

import { useRef, useState, type ReactNode } from "react";
import { createBooking, updateBooking } from "@/app/actions";
import { BOOKERS } from "@/config/bookers";
import { STATUS_LABEL } from "@/lib/bookings";
import { readLastBooker, readLastTeam, rememberBooker, rememberTeam } from "@/lib/client";
import { addMinutesLocal, dateToDhakaLocal, dhakaLocalToDate, formatDate, formatTimeRange } from "@/lib/time";
import type { Booking, BookingFormInput, FieldErrors, MutationResult, OverlapSummary } from "@/lib/types";
import { validateBooking } from "@/lib/validation";
import { AlertIcon } from "./icons";
import { Football } from "./football";
import { SquadEditor } from "./squad-editor";

type Props = {
  formId: string;
  booking: Booking | null;
  onSaved: (booking: Booking) => void;
  onReloadLatest: () => Promise<void>;
  onSavingChange: (saving: boolean) => void;
  /** Player names used in other bookings, for quick add. */
  knownPlayers: string[];
};

const DURATIONS = [
  { label: "1 h", minutes: 60 },
  { label: "1½ h", minutes: 90 },
  { label: "2 h", minutes: 120 },
];

function initialValues(booking: Booking | null): BookingFormInput {
  if (booking) {
    return {
      venueName: booking.venueName,
      startLocal: dateToDhakaLocal(booking.startAt),
      endLocal: dateToDhakaLocal(booking.endAt),
      bookedBy: booking.bookedBy,
      status: booking.status,
      teamName: booking.teamName ?? "",
      opponentName: booking.opponentName ?? "",
      totalCost: booking.totalCost?.toString() ?? "",
      advancePaid: booking.advancePaid?.toString() ?? "",
      contactPhone: booking.contactPhone ?? "",
      mapUrl: booking.mapUrl ?? "",
      notes: booking.notes ?? "",
      squad: booking.squad,
      ourScore: booking.ourScore?.toString() ?? "",
      opponentScore: booking.opponentScore?.toString() ?? "",
    };
  }
  return {
    venueName: "",
    startLocal: "",
    endLocal: "",
    bookedBy: readLastBooker() ?? "", // this device's last "Booked by"
    status: "confirmed",
    teamName: readLastTeam() ?? "", // this device's last team name
    opponentName: "",
    totalCost: "",
    advancePaid: "",
    contactPhone: "",
    mapUrl: "",
    notes: "",
    squad: [],
    ourScore: "",
    opponentScore: "",
  };
}

type TextField = Exclude<keyof BookingFormInput, "squad">;

const Required = () => (
  <span className="text-pitch-300" aria-hidden="true">
    {" "}
    *
  </span>
);

export function BookingForm({ formId, booking, onSaved, onReloadLatest, onSavingChange, knownPlayers }: Props) {
  const isEdit = booking !== null;

  const [values, setValues] = useState<BookingFormInput>(() => initialValues(booking));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [overlapList, setOverlapList] = useState<OverlapSummary[] | null>(null);
  const [stale, setStale] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const warningRef = useRef<HTMLDivElement>(null);

  const set = (key: TextField, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Fill a sensible end time when the start is picked first or moved past the end.
      if (key === "startLocal" && dhakaLocalToDate(value)) {
        const start = dhakaLocalToDate(value)!;
        const end = dhakaLocalToDate(prev.endLocal);
        if (!end || end <= start) next.endLocal = addMinutesLocal(value, 60) ?? prev.endLocal;
      }
      return next;
    });
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setOverlapList(null);
    setFormError(null);
  };

  const setSquad = (squad: string[]) => {
    setValues((prev) => ({ ...prev, squad }));
    setErrors((prev) => (prev.squad ? { ...prev, squad: undefined } : prev));
    setFormError(null);
  };

  const setDuration = (minutes: number) => {
    if (!dhakaLocalToDate(values.startLocal)) {
      setErrors((prev) => ({ ...prev, startLocal: "Pick the start first." }));
      return;
    }
    set("endLocal", addMinutesLocal(values.startLocal, minutes) ?? values.endLocal);
  };

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  async function submit(force: boolean) {
    if (savingRef.current) return;
    const check = validateBooking(values);
    if (!check.ok) {
      setErrors(check.fieldErrors);
      setFormError("Please fix the highlighted fields.");
      focusFirstError();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    onSavingChange(true);
    setFormError(null);
    let result: MutationResult;
    try {
      result = booking
        ? await updateBooking(booking.id, booking.updatedAt, values, { force })
        : await createBooking(values, { force });
    } catch {
      result = { ok: false, kind: "error", message: "Couldn't reach the server. Check your connection and try again." };
    } finally {
      savingRef.current = false;
      setSaving(false);
      onSavingChange(false);
    }

    if (result.ok) {
      rememberBooker(result.booking.bookedBy);
      rememberTeam(result.booking.teamName);
      onSaved(result.booking);
      return;
    }
    switch (result.kind) {
      case "overlap":
        setOverlapList(result.overlaps);
        requestAnimationFrame(() => warningRef.current?.focus());
        return;
      case "stale":
        setStale(result.message);
        return;
      case "invalid":
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        focusFirstError();
        return;
      default:
        setFormError(result.message);
    }
  }

  const field = (key: TextField) => ({
    id: `${formId}-${key}`,
    name: key,
    value: values[key],
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${formId}-${key}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
    disabled: saving,
  });

  const renderField = ({ name, label, hint, children }: { name: keyof BookingFormInput; label: ReactNode; hint?: string; children: ReactNode }) => (
    <div>
      <label htmlFor={`${formId}-${name}`} className="field-label">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !errors[name] && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {errors[name] && (
        <p id={`${formId}-${name}-error`} className="mt-1 text-sm text-rose-200">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form
      id={formId}
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      className="space-y-4"
      aria-busy={saving}
    >
      {stale && (
        <div role="alert" className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-3 text-sm text-amber-50">
          <p className="font-semibold">This booking was changed by someone else</p>
          <p className="mt-1 text-amber-100/90">{stale}</p>
          <button
            type="button"
            className="btn-secondary mt-2"
            disabled={reloading}
            onClick={async () => {
              setReloading(true);
              await onReloadLatest();
              setReloading(false);
            }}
          >
            {reloading ? "Loading…" : "Load latest version"}
          </button>
        </div>
      )}

      {renderField({
        name: "venueName",
        label: (
          <>
            Venue
            <Required />
          </>
        ),
        children: <input {...field("venueName")} className="field-input" autoComplete="off" placeholder="e.g. Kick-Off Arena, Banani" required />,
      })}

      <div className="grid gap-3 sm:grid-cols-2">
        {renderField({
          name: "teamName",
          label: "Our team",
          hint: "Optional — shown as “Team vs Opponent”.",
          children: <input {...field("teamName")} className="field-input" autoComplete="off" autoCapitalize="words" placeholder="e.g. Khelar FC" />,
        })}
        {renderField({
          name: "opponentName",
          label: "Opponent",
          hint: "Optional — leave blank if not fixed yet.",
          children: <input {...field("opponentName")} className="field-input" autoComplete="off" autoCapitalize="words" placeholder="e.g. Gulshan Strikers" />,
        })}
      </div>

      <fieldset className="rounded-2xl border border-white/10 p-3.5">
        <legend className="px-1 text-sm font-semibold text-slate-200">
          Slot (Dhaka time)
          <Required />
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {renderField({
            name: "startLocal",
            label: "Starts",
            children: <input {...field("startLocal")} type="datetime-local" className="field-input" required />,
          })}
          {renderField({
            name: "endLocal",
            label: "Ends",
            children: (
              <input
                {...field("endLocal")}
                type="datetime-local"
                className="field-input"
                min={values.startLocal || undefined}
                required
              />
            ),
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Set length from start time">
          <span className="text-xs text-slate-400">Length:</span>
          {DURATIONS.map((d) => (
            <button key={d.minutes} type="button" className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-pitch-300" onClick={() => setDuration(d.minutes)} disabled={saving}>
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${formId}-bookedBy`} className="field-label">
          Booked by
          <Required />
        </label>
        <input
          {...field("bookedBy")}
          className="field-input mt-1.5"
          autoComplete="off"
          autoCapitalize="words"
          placeholder="Who booked this slot?"
        />
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick pick">
          {BOOKERS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => set("bookedBy", name)}
              disabled={saving}
              aria-pressed={values.bookedBy.toLowerCase() === name.toLowerCase()}
              className="min-h-10 rounded-full border border-white/15 px-4 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-pitch-300 aria-pressed:border-pitch-400 aria-pressed:bg-pitch-500/15 aria-pressed:text-pitch-100"
            >
              {name}
            </button>
          ))}
        </div>
        {errors.bookedBy && (
          <p id={`${formId}-bookedBy-error`} className="mt-1 text-sm text-rose-200">
            {errors.bookedBy}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="field-label">Status</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(isEdit ? (["confirmed", "pending", "cancelled"] as const) : (["confirmed", "pending"] as const)).map((s) => (
            <label
              key={s}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/14 bg-navy-950/50 px-2 text-sm font-semibold transition has-checked:border-pitch-400 has-checked:bg-pitch-500/15 has-focus-visible:outline-2 has-focus-visible:outline-pitch-300"
            >
              <input type="radio" name="status" value={s} checked={values.status === s} onChange={() => set("status", s)} disabled={saving} className="sr-only" />
              {STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-white/10 p-3.5">
        <legend className="px-1 text-sm font-semibold text-slate-200">Result</legend>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          {renderField({
            name: "ourScore",
            label: "Our goals",
            children: <input {...field("ourScore")} inputMode="numeric" pattern="[0-9]*" maxLength={2} className="field-input text-center text-lg font-bold" placeholder="–" autoComplete="off" />,
          })}
          <span className="font-display pb-2.5 text-2xl font-bold text-slate-400" aria-hidden="true">
            –
          </span>
          {renderField({
            name: "opponentScore",
            label: values.opponentName.trim() ? `${values.opponentName.trim().slice(0, 18)} goals` : "Their goals",
            children: <input {...field("opponentScore")} inputMode="numeric" pattern="[0-9]*" maxLength={2} className="field-input text-center text-lg font-bold" placeholder="–" autoComplete="off" />,
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">Fill in after the match. Leave both empty if it hasn&apos;t been played.</p>
      </fieldset>

      <SquadEditor
        id={`${formId}-squad`}
        value={values.squad}
        onChange={setSquad}
        suggestions={knownPlayers}
        disabled={saving}
        error={errors.squad}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {renderField({
          name: "totalCost",
          label: "Total cost (৳ BDT)",
          children: <input {...field("totalCost")} inputMode="decimal" className="field-input" placeholder="e.g. 3000" autoComplete="off" />,
        })}
        {renderField({
          name: "advancePaid",
          label: "Advance paid (৳ BDT)",
          children: <input {...field("advancePaid")} inputMode="decimal" className="field-input" placeholder="e.g. 1000" autoComplete="off" />,
        })}
      </div>

      {renderField({
        name: "contactPhone",
        label: "Venue contact phone",
        children: <input {...field("contactPhone")} type="tel" inputMode="tel" className="field-input" placeholder="e.g. 01712-345678" autoComplete="off" />,
      })}

      {renderField({
        name: "mapUrl",
        label: "Google Maps link",
        children: <input {...field("mapUrl")} type="url" inputMode="url" className="field-input" placeholder="https://maps.app.goo.gl/…" autoComplete="off" />,
      })}

      {renderField({
        name: "notes",
        label: "Notes",
        children: <textarea {...field("notes")} rows={3} className="field-input resize-y" placeholder="Bibs, ball, who's bringing water…" />,
      })}

      {overlapList && (
        <div
          ref={warningRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-3.5 text-sm text-amber-50 outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <p className="flex items-center gap-2 font-semibold">
            <AlertIcon width={18} height={18} /> This slot overlaps {overlapList.length === 1 ? "another booking" : `${overlapList.length} bookings`}
          </p>
          <ul className="mt-2 space-y-1 text-amber-100/90">
            {overlapList.map((o) => (
              <li key={o.id}>
                <span className="font-medium">{o.venueName}</span>
                {o.opponentName ? ` vs ${o.opponentName}` : ""} — {formatDate(o.startAt)}, {formatTimeRange(o.startAt, o.endAt)} ({STATUS_LABEL[o.status]})
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void submit(true)}>
              Save anyway
            </button>
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setOverlapList(null)}>
              Go back and change
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {formError && <p className="animate-shake rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{formError}</p>}
      </div>

      <span className="sr-only" aria-live="polite">
        {saving ? "Saving booking" : ""}
      </span>
      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-300" aria-hidden="true">
          <Football className="animate-spin-slow h-4 w-4" /> Saving…
        </div>
      )}
    </form>
  );
}
