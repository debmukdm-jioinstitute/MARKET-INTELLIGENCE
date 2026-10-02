"use client";

import { useSyncExternalStore } from "react";

const KEY = "mi-alerts-gamification";

type GamiState = { firstRuleAt: string | null };

const EMPTY: GamiState = { firstRuleAt: null };

// Cache by raw localStorage string so getSnapshot is referentially stable.
let raw: string | null = "<unset>";
let parsed: GamiState = EMPTY;
const listeners = new Set<() => void>();

function read(): GamiState {
  let r: string | null = null;
  try {
    r = localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  if (r === raw) return parsed;
  raw = r;
  try {
    const p = r ? (JSON.parse(r) as Partial<GamiState>) : null;
    parsed = { firstRuleAt: typeof p?.firstRuleAt === "string" ? p.firstRuleAt : null };
  } catch {
    parsed = EMPTY;
  }
  return parsed;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

function write(next: GamiState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  raw = "<unset>"; // force re-read on next getSnapshot
  emit();
}

/** Badges: "first-alert" when the user has at least one rule, "market-covered" at 3+ active rules. */
export function useAlertsGamification(ruleCount: number, activeCount: number) {
  const g = useSyncExternalStore(subscribe, read, read);
  return {
    badges: {
      firstAlert: ruleCount > 0,
      marketCovered: activeCount >= 3,
      since: g.firstRuleAt,
    },
    markFirstRule() {
      if (!read().firstRuleAt) write({ firstRuleAt: new Date().toISOString() });
    },
  };
}
