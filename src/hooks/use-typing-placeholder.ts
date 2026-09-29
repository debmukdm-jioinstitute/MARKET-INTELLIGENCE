"use client";

import { useEffect, useState } from "react";

type Options = {
  enabled: boolean;
  prefix: string;
  samples: readonly string[];
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
  betweenMs?: number;
};

/** Cycles typed suffix after a fixed prefix (respects reduced motion). */
export function useTypingPlaceholder({
  enabled,
  prefix,
  samples,
  typeMs = 55,
  deleteMs = 32,
  holdMs = 2200,
  betweenMs = 400,
}: Options): string {
  const [suffix, setSuffix] = useState(samples[0] ?? "");

  useEffect(() => {
    if (!enabled || samples.length === 0) {
      setSuffix(samples[0] ?? "");
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setSuffix(samples[0] ?? "");
      return;
    }

    let sampleIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer = 0;

    const schedule = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms);
    };

    const step = () => {
      const sample = samples[sampleIdx] ?? "";
      if (!deleting) {
        charIdx += 1;
        setSuffix(sample.slice(0, charIdx));
        if (charIdx >= sample.length) {
          schedule(() => {
            deleting = true;
            step();
          }, holdMs);
          return;
        }
        schedule(step, typeMs);
        return;
      }

      charIdx -= 1;
      setSuffix(sample.slice(0, charIdx));
      if (charIdx <= 0) {
        deleting = false;
        sampleIdx = (sampleIdx + 1) % samples.length;
        schedule(step, betweenMs);
        return;
      }
      schedule(step, deleteMs);
    };

    charIdx = 0;
    deleting = false;
    setSuffix("");
    schedule(step, betweenMs);

    return () => window.clearTimeout(timer);
  }, [enabled, samples, typeMs, deleteMs, holdMs, betweenMs]);

  return `${prefix}${suffix}`;
}
