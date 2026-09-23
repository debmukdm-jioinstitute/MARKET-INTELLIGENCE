"use client";

import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

const SOURCES = ["Upstox", "NSE India", "Yahoo Finance", "World Bank", "MOSPI", "FRED", "RBI"];

/**
 * Shown only on first load, while the slower multi-source payload (macro,
 * liquidity, money flow) is still in flight — so a blank/dash card reads as
 * "still loading" instead of "broken".
 */
export function FetchingBanner({ active }: { active: boolean }) {
  const [value, setValue] = useState(8);
  const [sourceIdx, setSourceIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const progressTimer = window.setInterval(() => {
      setValue((v) => (v < 92 ? v + (92 - v) * 0.15 : v));
    }, 300);
    const sourceTimer = window.setInterval(() => {
      setSourceIdx((i) => (i + 1) % SOURCES.length);
    }, 900);
    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(sourceTimer);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Fetching data from multiple sources…</p>
        <span className="text-sm text-muted-foreground">{SOURCES[sourceIdx]}</span>
      </div>
      <Progress value={value} />
      <p className="text-sm text-muted-foreground">
        First load pulls live quotes, F&amp;O, macro, and liquidity data from several APIs — usually a few seconds.
      </p>
    </div>
  );
}
