"use client";

import { Award, Radar, Rocket } from "lucide-react";
import { useAlertsGamification } from "./use-gamification";

/**
 * Lightweight, localStorage-only motivation strip:
 * "Create your first alert" and "3 rules watching the market". No backend changes.
 */
export function BadgeStrip({ ruleCount, activeCount }: { ruleCount: number; activeCount: number }) {
  const { badges } = useAlertsGamification(ruleCount, activeCount);

  const items = [
    {
      earned: badges.firstAlert,
      icon: Rocket,
      title: "First alert",
      hint: "Create your first rule",
    },
    {
      earned: badges.marketCovered,
      icon: Radar,
      title: "Market covered",
      hint: `${activeCount}/3 rules watching`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {items.map((b) => {
        const Icon = b.icon;
        return (
          <div
            key={b.title}
            title={b.earned ? b.title : b.hint}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm ${
              b.earned
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-dashed border-border bg-card text-muted-foreground"
            }`}
          >
            {b.earned ? <Award className="size-4" /> : <Icon className="size-4 opacity-60" />}
            {b.earned ? b.title : b.hint}
          </div>
        );
      })}
      {badges.firstAlert ? (
        <p className="w-full text-xs text-muted-foreground sm:w-auto sm:pl-1">
          Nice — your rules are checked every 3 hours. Keep building coverage.
        </p>
      ) : null}
    </div>
  );
}
