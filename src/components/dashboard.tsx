"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cancelBooking, deleteBooking } from "@/app/actions";
import { knownPlayers, nextConfirmedMatch, splitBookings } from "@/lib/bookings";
import { copyText, useIsDesktop, useNow, usePrefersReducedMotion } from "@/lib/client";
import { matchShareText } from "@/lib/share";
import type { Booking } from "@/lib/types";
import { BookingDetails } from "./booking-details";
import { BookingForm } from "./booking-form";
import { BookingList } from "./booking-list";
import { Football } from "./football";
import { AlertIcon, PlusIcon, RefreshIcon } from "./icons";
import { BouncingBall, GoalCelebration } from "./motion";
import { NextMatchCard } from "./next-match-card";
import { Sheet } from "./sheet";

type Tab = "upcoming" | "past" | "cancelled";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY_COPY: Record<Tab, { title: string; body: string }> = {
  upcoming: { title: "No upcoming bookings", body: "Booked a slot with a venue? Add it here so nobody double-books." },
  past: { title: "Nothing in the past yet", body: "Bookings move here once their end time has passed." },
  cancelled: { title: "No cancelled bookings", body: "Cancelled bookings are kept here for reference." },
};

type FormState = { booking: Booking | null; key: string } | null;
type Toast = { id: number; message: string; tone: "ok" | "error" };

export function Dashboard() {
  const now = useNow();
  const isDesktop = useIsDesktop();
  const reducedMotion = usePrefersReducedMotion();
  const tabsId = useId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formSeq, setFormSeq] = useState(0);
  const [busy, setBusy] = useState<"cancel" | "delete" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);

  const inflight = useRef<Promise<Booking[] | null> | null>(null);
  const lastLoadedAt = useRef(0);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const load = useCallback((): Promise<Booking[] | null> => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/bookings", { cache: "no-store", headers: { accept: "application/json" } });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            body.error === "config_missing"
              ? "The app isn't connected to Supabase. Check the server configuration."
              : "Couldn't load bookings. Check your connection and try again.",
          );
        }
        const data = (await res.json()) as { bookings: Booking[] };
        setBookings(data.bookings);
        setLoadError(null);
        lastLoadedAt.current = Date.now();
        return data.bookings;
      } catch (error) {
        setLoadError(error instanceof Error && error.message ? error.message : "Couldn't load bookings.");
        return null;
      } finally {
        setLoaded(true);
        setRefreshing(false);
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, []);

  // Load on mount, and again whenever the tab/window regains focus.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoadedAt.current > 3000) void load();
    };
    const initial = window.setTimeout(() => void load(), 0);
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!celebrating) return;
    const id = window.setTimeout(() => setCelebrating(false), 2600);
    return () => window.clearTimeout(id);
  }, [celebrating]);

  const groups = useMemo(() => splitBookings(bookings, now), [bookings, now]);
  const players = useMemo(() => knownPlayers(bookings), [bookings]);
  const nextMatch = useMemo(() => nextConfirmedMatch(bookings, now), [bookings, now]);
  const pendingCount = groups.upcoming.filter((b) => b.status === "pending").length;
  const list = groups[tab];
  const selected = list.find((b) => b.id === selectedId) ?? (isDesktop ? list[0] : undefined) ?? null;
  const mobileSelected = bookings.find((b) => b.id === selectedId) ?? null;

  const openBooking = (b: Booking) => {
    setSelectedId(b.id);
    const target: Tab = b.status === "cancelled" ? "cancelled" : Date.parse(b.endAt) <= now ? "past" : "upcoming";
    setTab(target);
    if (!isDesktop) setMobileDetailsOpen(true);
  };

  const openForm = (booking: Booking | null) => {
    setMobileDetailsOpen(false);
    setFormSeq((n) => n + 1);
    setForm({ booking, key: booking ? `${booking.id}:${booking.updatedAt}` : "new" });
  };

  const upsertLocal = (b: Booking) =>
    setBookings((prev) => (prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [...prev, b]));

  const handleSaved = (saved: Booking) => {
    const isNew = form?.booking === null;
    upsertLocal(saved);
    setForm(null);
    setSelectedId(saved.id);
    setTab(saved.status === "cancelled" ? "cancelled" : Date.parse(saved.endAt) <= Date.now() ? "past" : "upcoming");
    showToast(isNew ? "Booking added" : "Changes saved");
    if (isNew && saved.status !== "cancelled" && !reducedMotion) setCelebrating(true);
    void load();
  };

  const runDestructive = async (b: Booking, kind: "cancel" | "delete") => {
    if (busy) return;
    setBusy(kind);
    try {
      const result = kind === "cancel" ? await cancelBooking(b.id, b.updatedAt) : await deleteBooking(b.id, b.updatedAt);
      if (result.ok) {
        if (kind === "cancel") upsertLocal(result.booking);
        else setBookings((prev) => prev.filter((x) => x.id !== b.id));
        showToast(kind === "cancel" ? "Booking cancelled" : "Booking deleted");
        setMobileDetailsOpen(false);
      } else {
        showToast("message" in result ? result.message : "Something went wrong. Try again.", "error");
      }
    } catch {
      showToast("Couldn't reach the server. Try again.", "error");
    } finally {
      setBusy(null);
      void load();
    }
  };

  const handleCopy = async (b: Booking) => {
    const text = matchShareText(b);
    if (await copyText(text)) showToast("Match details copied");
    else setManualCopy(text);
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + delta + TABS.length) % TABS.length;
    setTab(TABS[nextIndex].id);
    document.getElementById(`${tabsId}-tab-${TABS[nextIndex].id}`)?.focus();
  };

  const details = (b: Booking) => (
    <BookingDetails
      key={b.id}
      booking={b}
      allBookings={bookings}
      now={now}
      busy={busy}
      onEdit={() => openForm(b)}
      onCancel={() => runDestructive(b, "cancel")}
      onDelete={() => runDestructive(b, "delete")}
      onCopy={() => void handleCopy(b)}
    />
  );

  return (
    <div className="relative min-h-dvh">
      <div className="pitch-backdrop" aria-hidden="true" />

      <header className="sticky top-0 z-30 border-b border-white/8 bg-navy-950/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Football className="h-8 w-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-pitch-300">
                Khelar
              </p>
              <h1 className="font-display truncate text-xl font-bold uppercase">Match Planner</h1>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => void load()}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing bookings" : "Refresh bookings"}
            title="Refresh"
          >
            {refreshing ? <Football className="animate-spin-slow h-5 w-5" /> : <RefreshIcon />}
          </button>
          <button type="button" className="btn-primary hidden sm:inline-flex" onClick={() => openForm(null)}>
            <PlusIcon /> New booking
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pb-28 pt-5 sm:pb-10">
        {loadError && loaded && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3.5 text-sm text-rose-50">
            <AlertIcon className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{loadError}</p>
              {bookings.length > 0 && <p className="text-rose-100/80">Showing the last bookings that loaded successfully.</p>}
            </div>
            <button type="button" className="btn-secondary py-1.5" onClick={() => void load()} disabled={refreshing}>
              Retry
            </button>
          </div>
        )}

        {!loaded ? (
          <BouncingBall label="Loading bookings…" />
        ) : loadError && bookings.length === 0 ? null : (
          <>
            <NextMatchCard booking={nextMatch} pendingCount={pendingCount} now={now} onOpen={openBooking} onAdd={() => openForm(null)} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <section aria-label="Bookings" className="min-w-0">
                <div
                  role="tablist"
                  aria-label="Booking lists"
                  className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-navy-950/70 p-1 ring-1 ring-white/10"
                >
                  {TABS.map((t, i) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        id={`${tabsId}-tab-${t.id}`}
                        role="tab"
                        type="button"
                        aria-selected={active}
                        aria-controls={`${tabsId}-panel`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setTab(t.id)}
                        onKeyDown={(e) => onTabKey(e, i)}
                        className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-[0.8125rem] font-semibold transition min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-sm focus-visible:outline-2 focus-visible:outline-pitch-300 ${
                          active ? "bg-pitch-500 text-navy-950 shadow" : "text-slate-300 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        {t.label}
                        <span
                          className={`rounded-full px-1.5 text-[0.6875rem] min-[360px]:text-xs ${active ? "bg-navy-950/20" : "bg-white/10"}`}
                          aria-label={`${groups[t.id].length} bookings`}
                        >
                          {groups[t.id].length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`}>
                  {list.length === 0 ? (
                    <div className="card-surface flex flex-col items-center rounded-3xl px-6 py-12 text-center">
                      {tab === "upcoming" ? (
                        <div className="kickoff-scene w-full max-w-64" aria-hidden="true">
                          <div className="goal-net" />
                          <div className="kickoff-ball">
                            <Football className="h-full w-full" />
                          </div>
                          <div className="kickoff-shadow" />
                        </div>
                      ) : (
                        <>
                          <div className="ball-roll-idle h-14 w-14">
                            <Football className="h-full w-full" />
                          </div>
                          <div className="mt-1 h-px w-28 bg-white/20" aria-hidden="true" />
                        </>
                      )}
                      <p className="mt-4 text-lg font-semibold">{EMPTY_COPY[tab].title}</p>
                      <p className="mt-1 max-w-xs text-sm text-slate-300">{EMPTY_COPY[tab].body}</p>
                      {tab === "upcoming" && (
                        <button type="button" className="btn-primary mt-5" onClick={() => openForm(null)}>
                          <PlusIcon /> Add a booking
                        </button>
                      )}
                    </div>
                  ) : (
                    <BookingList
                      key={tab}
                      bookings={list}
                      allBookings={bookings}
                      selectedId={isDesktop ? (selected?.id ?? null) : null}
                      now={now}
                      showRelative={tab === "upcoming"}
                      onSelect={openBooking}
                    />
                  )}
                </div>
              </section>

              <aside aria-label="Booking details" className="hidden lg:block">
                <div className="card-surface sticky top-20 rounded-3xl p-5">
                  {selected ? (
                    details(selected)
                  ) : (
                    <p className="py-10 text-center text-slate-300">Select a booking to see its details.</p>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <button
        type="button"
        onClick={() => openForm(null)}
        className="btn-primary fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-20 rounded-full px-5 py-3.5 text-base shadow-xl sm:hidden"
      >
        <PlusIcon /> New booking
      </button>

      <Sheet
        open={!isDesktop && mobileDetailsOpen && mobileSelected !== null}
        onClose={() => setMobileDetailsOpen(false)}
        title="Booking"
        locked={busy !== null}
      >
        {mobileSelected && details(mobileSelected)}
      </Sheet>

      <Sheet
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.booking ? "Edit booking" : "New booking"}
        locked={formSaving}
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)} disabled={formSaving}>
              Close
            </button>
            <button type="submit" form="booking-form" className="btn-primary flex-[2]" disabled={formSaving}>
              {formSaving ? "Saving…" : form?.booking ? "Save changes" : "Save booking"}
            </button>
          </div>
        }
      >
        {form && (
          <BookingForm
            key={`${form.key}:${formSeq}`}
            formId="booking-form"
            booking={form.booking}
            onSaved={handleSaved}
            onSavingChange={setFormSaving}
            knownPlayers={players}
            onReloadLatest={async () => {
              const fresh = await load();
              const id = form.booking?.id;
              const latest = fresh?.find((b) => b.id === id);
              if (latest) setForm({ booking: latest, key: `${latest.id}:${latest.updatedAt}` });
              else if (fresh) {
                setForm(null);
                showToast("That booking no longer exists.", "error");
              }
            }}
          />
        )}
      </Sheet>

      <Sheet open={manualCopy !== null} onClose={() => setManualCopy(null)} title="Copy details">
        <p className="mb-2 text-sm text-slate-300">Your browser blocked automatic copying. Select the text below and copy it.</p>
        <textarea
          readOnly
          value={manualCopy ?? ""}
          rows={10}
          className="field-input font-mono text-sm"
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          aria-label="Match details"
        />
      </Sheet>

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-6">
        {toast && (
          <p
            key={toast.id}
            className={`animate-rise pointer-events-auto rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl ring-1 ${
              toast.tone === "ok" ? "bg-pitch-600 text-white ring-pitch-300/50" : "bg-rose-700 text-white ring-rose-300/50"
            }`}
          >
            {toast.message}
          </p>
        )}
      </div>

      {celebrating && <GoalCelebration onDone={() => setCelebrating(false)} />}
    </div>
  );
}
