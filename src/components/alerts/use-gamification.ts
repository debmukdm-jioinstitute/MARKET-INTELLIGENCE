"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { awardXp } from "@/lib/gamification/client";

const KEY = "mi-alerts-gamification";

type GamiState = { firstRuleAt: string | null; coverageAwardedAt: string | null };

const EMPTY: GamiState = { firstRuleAt: null, coverageAwardedAt: null };

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
    parsed = {
      firstRuleAt: typeof p?.firstRuleAt === "string" ? p.firstRuleAt : null,
      coverageAwardedAt: typeof p?.coverageAwardedAt === "string" ? p.coverageAwardedAt : null,
    };
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
  const { user, isGuest, ready } = useAuth();
  const signedIn = ready && !!user && !isGuest;
  const g = useSyncExternalStore(subscribe, read, read);
  const covered = activeCount >= 3;

  // One-time server award the first time the user reaches 3 active rules.
  // Idempotent across the two hook instances (page + badge strip): the first
  // writer wins, the second sees coverageAwardedAt and skips.
  useEffect(() => {
    if (!covered || !signedIn) return;
    const cur = read();
    if (cur.coverageAwardedAt) return;
    write({ ...cur, coverageAwardedAt: new Date().toISOString() });
    void awardXp("alert_coverage_3", "alerts");
  }, [covered, signedIn]);

  return {
    badges: {
      firstAlert: ruleCount > 0,
      marketCovered: covered,
      since: g.firstRuleAt,
    },
    markFirstRule() {
      const cur = read();
      if (cur.firstRuleAt) return false;
      write({ ...cur, firstRuleAt: new Date().toISOString() });
      // Mirror the local award on the server for signed-in users (guests: 401, ignored).
      if (signedIn) void awardXp("first_alert_created", "alerts");
      return true;
    },
  };
}
