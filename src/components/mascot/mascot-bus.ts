"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { MascotTip } from "./mascot-tips";

type Override = { key: string; tip: MascotTip } | null;

let current: Override = null;
const listeners = new Set<() => void>();

function set(next: Override) {
  current = next;
  listeners.forEach((l) => l());
}

export function useMascotOverride(): Override {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}

/** A page publishes a context-aware tip for Mi; cleared automatically on unmount. */
export function usePublishMascotTip(key: string | null, tip: MascotTip | null) {
  const text = tip?.text;
  const href = tip?.cta?.href;
  const label = tip?.cta?.label;
  const gesture = tip?.gesture;
  useEffect(() => {
    if (!key || !text || !gesture) return;
    set({ key, tip: { text, gesture, cta: href && label ? { href, label } : undefined } });
    return () => set(null);
  }, [key, text, href, label, gesture]);
}
