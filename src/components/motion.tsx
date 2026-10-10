"use client";

import type { CSSProperties } from "react";
import { Football } from "./football";

export function BouncingBall({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-4 py-16 text-slate-300">
      <div className="relative flex h-24 w-16 items-end justify-center" aria-hidden="true">
        <div className="bounce-ball absolute bottom-3 h-12 w-12">
          <Football className="h-full w-full" />
        </div>
        <div className="bounce-shadow h-2 w-10 rounded-full bg-black/60 blur-[2px]" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

const CONFETTI = [
  { dx: "-120px", dy: "-90px", c: "#4ade80" },
  { dx: "-60px", dy: "-130px", c: "#ffffff" },
  { dx: "10px", dy: "-140px", c: "#fbbf24" },
  { dx: "80px", dy: "-110px", c: "#4ade80" },
  { dx: "120px", dy: "-40px", c: "#ffffff" },
  { dx: "-140px", dy: "-20px", c: "#fbbf24" },
  { dx: "60px", dy: "40px", c: "#86efac" },
  { dx: "-70px", dy: "50px", c: "#ffffff" },
  { dx: "130px", dy: "20px", c: "#fbbf24" },
  { dx: "-20px", dy: "70px", c: "#4ade80" },
];

/** Ball flies into the net, "GOAL!" pops. Purely decorative; render only when motion is allowed. */
export function GoalCelebration({ onDone }: { onDone: () => void }) {
  return (
    <div className="goal-overlay" aria-hidden="true" onAnimationEnd={(e) => e.target === e.currentTarget && onDone()}>
      <div className="goal-stage">
        <div className="goal-net" />
        <div className="goal-ball">
          <Football className="h-full w-full" />
        </div>
        {CONFETTI.map((p, i) => (
          <span
            key={i}
            className="confetti"
            style={{ background: p.c, "--dx": p.dx, "--dy": p.dy } as CSSProperties}
          />
        ))}
        <p className="goal-word">GOAL!</p>
      </div>
    </div>
  );
}
