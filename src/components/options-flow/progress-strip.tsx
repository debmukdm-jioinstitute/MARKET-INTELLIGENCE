"use client";

import { Award, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { recordVisit, type OptionsFlowProgress } from "./progress";

/**
 * Lightweight gamification, localStorage only: a streak for checking the daily
 * flags and a "spot your first flag" badge. No backend, no auth, no tracking.
 */
export function ProgressStrip() {
  const [progress, setProgress] = useState<OptionsFlowProgress | null>(null);

  useEffect(() => {
    setProgress(recordVisit());
  }, []);

  if (!progress) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm">
        <Flame className="size-4 text-orange-500" />
        <span className="font-bold">{progress.streak}</span>
        <span className="text-muted-foreground">day{progress.streak === 1 ? "" : "s"} checking flags</span>
      </span>
      {progress.firstFlagAt ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-600/30 bg-blue-600/[0.06] px-3 py-1.5 text-sm">
          <Award className="size-4 text-blue-700" />
          <span className="font-medium text-blue-800">First flag spotted</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-white px-3 py-1.5 text-sm text-muted-foreground">
          <Award className="size-4" />
          Spot your first flag to earn a badge
        </span>
      )}
    </div>
  );
}
