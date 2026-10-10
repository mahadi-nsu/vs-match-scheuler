"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Current time, re-read every `intervalMs` so "past"/"days left" stay accurate. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

const LAST_BOOKER_KEY = "khelar:last-booked-by";

export function readLastBooker(): string | null {
  try {
    return window.localStorage.getItem(LAST_BOOKER_KEY);
  } catch {
    return null;
  }
}

export function rememberBooker(name: string) {
  try {
    window.localStorage.setItem(LAST_BOOKER_KEY, name);
  } catch {
    // Private mode or storage disabled: nothing to remember.
  }
}

const LAST_TEAM_KEY = "khelar:last-team-name";

export function readLastTeam(): string | null {
  try {
    return window.localStorage.getItem(LAST_TEAM_KEY);
  } catch {
    return null;
  }
}

export function rememberTeam(name: string | null) {
  try {
    if (name) window.localStorage.setItem(LAST_TEAM_KEY, name);
  } catch {
    // storage unavailable
  }
}

/** Tries the async Clipboard API, then the legacy execCommand path. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
