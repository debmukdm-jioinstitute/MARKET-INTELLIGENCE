"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  creditBonus,
  creditMission,
  creditVisit,
  creditWelcomeStep,
  getISTDate,
  parseStore,
  type BonusId,
  type MissionId,
  type MissionStore,
} from "@/lib/gamification/missions";

const KEY = "mi_missions_v1";
const EVENT = "mi_missions_updated";
let memory = "";
let welcomedMemory = false;

function snapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}
const serverSnapshot = () => "";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(EVENT, notify);
  };
}
function update(transform: (s: MissionStore) => MissionStore) {
  const before = snapshot();
  const next = transform(parseStore(before));
  const raw = JSON.stringify(next);
  if (before === raw) return;
  memory = raw;
  try {
    localStorage.setItem(KEY, raw);
    if (next.badges.includes("first-steps"))
      localStorage.setItem("mi_welcomed", "1");
  } catch {
    /* Session-only progress when storage is unavailable. */
  }
  window.dispatchEvent(new Event(EVENT));
}
function welcomedSnapshot() {
  try {
    return localStorage.getItem("mi_welcomed") === "1" || welcomedMemory;
  } catch {
    return welcomedMemory;
  }
}

export const homeActions = {
  mission: (id: MissionId) => update((s) => creditMission(s, id)),
  trackStock: () => update((s) => creditWelcomeStep(s, "track-stock")),
  bonus: (id: BonusId) => update((s) => creditBonus(s, id)),
  dismiss: () => {
    welcomedMemory = true;
    try {
      localStorage.setItem("mi_welcomed", "1");
    } catch {
      /* memory fallback */
    }
    update((s) => ({ ...s, firstStepsCelebrated: true }));
    window.dispatchEvent(new Event(EVENT));
  },
};

/** The only timer updates the IST clock, never fetches market data. */
export function useHomeClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer: number;
    const tick = () => {
      setNow(new Date());
      clearTimeout(timer);
      // Align to clock minutes, including midnight IST, instead of drifting from mount time.
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    tick();
    window.addEventListener("focus", tick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}

export function useHomeProgress(now: Date | null) {
  // A primitive snapshot avoids React #185 and object churn across repeated reads.
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const welcomed = useSyncExternalStore(
    subscribe,
    welcomedSnapshot,
    () => true,
  );
  const store = useMemo(() => parseStore(raw), [raw]);
  const today = now ? getISTDate(now) : "";
  useEffect(() => {
    if (today) update((s) => creditVisit(s));
  }, [today]);
  return { store, welcomed, today, actions: homeActions };
}
export type HomeProgress = ReturnType<typeof useHomeProgress>;
