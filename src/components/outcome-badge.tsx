import { OUTCOME_LABEL, type Outcome } from "@/lib/bookings";

const STYLES: Record<Outcome, string> = {
  win: "bg-pitch-500 text-navy-950 ring-pitch-300",
  draw: "bg-slate-200 text-navy-950 ring-white/60",
  loss: "bg-rose-500/20 text-rose-100 ring-rose-400/50",
};

const SHORT = { win: "W", draw: "D", loss: "L" } as const;

export function OutcomeBadge({ outcome, score, large = false }: { outcome: Outcome; score?: string; large?: boolean }) {
  if (large) {
    return (
      <span className={`font-display rounded-2xl px-4 py-2 text-2xl font-extrabold uppercase ring-1 ring-inset ${STYLES[outcome]}`}>
        {OUTCOME_LABEL[outcome]}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${STYLES[outcome]}`}
      aria-label={`${OUTCOME_LABEL[outcome]}${score ? ` ${score}` : ""}`}
    >
      <span aria-hidden="true">{SHORT[outcome]}</span>
      {score && <span aria-hidden="true">{score}</span>}
    </span>
  );
}
