"use client";

import { awardXp } from "@/lib/gamification/client";

const KEY = "mi-options-flow-progress";

export type OptionsFlowProgress = {
  /** ISO date (YYYY-MM-DD) of the last day the page was visited. */
  lastVisit: string | null;
  /** Consecutive days the page was visited. */
  streak: number;
  /** ISO timestamp when the user's first flag was spotted, or null. */
  firstFlagAt: string | null;
};

const EMPTY: OptionsFlowProgress = { lastVisit: null, streak: 0, firstFlagAt: null };

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

function read(): OptionsFlowProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<OptionsFlowProgress>;
    return {
      lastVisit: typeof parsed.lastVisit === "string" ? parsed.lastVisit : null,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      firstFlagAt: typeof parsed.firstFlagAt === "string" ? parsed.firstFlagAt : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

function write(next: OptionsFlowProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — progress just won't persist */
  }
}

/** Record today's visit and return the updated progress. Safe to call once per page mount. */
export function recordVisit(): OptionsFlowProgress {
  const prev = read();
  const today = todayKey();
  if (prev.lastVisit === today) return prev;
  const next: OptionsFlowProgress = {
    lastVisit: today,
    streak: prev.lastVisit === yesterdayKey() ? prev.streak + 1 : 1,
    firstFlagAt: prev.firstFlagAt,
  };
  write(next);
  // Mirror the daily check-in on the server (guests get a 401, silently ignored).
  void awardXp("daily_checkin", "options-flow");
  return next;
}

/** Mark the "spot your first flag" badge as earned. Returns true if this call earned it. */
export function recordFirstFlag(): boolean {
  const prev = read();
  if (prev.firstFlagAt) return false;
  write({ ...prev, firstFlagAt: new Date().toISOString() });
  // Mirror the local award on the server (guests get a 401, silently ignored).
  void awardXp("first_flag_spotted", "options-flow");
  return true;
}
