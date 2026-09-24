"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Monitor = { id: string; keywords: string[]; color: string };

const KEY = "mi_monitors_v1";
export const MONITOR_COLORS = ["#2563eb", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0891b2"];
const EMPTY: Monitor[] = [];

let cachedRaw: string | null = null;
let cached: Monitor[] = EMPTY;

function read(): Monitor[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    cached = raw ? (JSON.parse(raw) as Monitor[]) : EMPTY;
    return cached;
  } catch {
    return EMPTY;
  }
}

function write(next: Monitor[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("mi_monitors_updated"));
  } catch {
    /* storage unavailable (private mode): monitors simply won't persist */
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener("mi_monitors_updated", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("mi_monitors_updated", cb);
    window.removeEventListener("storage", cb);
  };
};

/** Personal keyword monitors, stored only in this browser (no account, nothing sent to a server). */
export function useMonitors() {
  const monitors = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((text: string) => {
    const keywords = text.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 8);
    if (!keywords.length) return;
    const cur = read();
    if (cur.length >= 12) return;
    write([...cur, { id: `m-${Date.now()}`, keywords, color: MONITOR_COLORS[cur.length % MONITOR_COLORS.length] }]);
  }, []);

  const remove = useCallback((id: string) => write(read().filter((m) => m.id !== id)), []);

  return { monitors, add, remove };
}

export function matchMonitor(monitors: Monitor[], title: string): Monitor | null {
  const t = title.toLowerCase();
  return monitors.find((m) => m.keywords.some((k) => t.includes(k))) ?? null;
}
