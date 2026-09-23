"use client";

import type { MacroRegimeBlock } from "@/lib/macro/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const QUADRANT_COPY: Record<string, { desc: string; color: string }> = {
  goldilocks: { desc: "Growth ↑ · Inflation ↓", color: "from-emerald-500/20 to-emerald-900/10" },
  reflation: { desc: "Growth ↑ · Inflation ↑", color: "from-blue-600/20 to-orange-900/10" },
  stagflation: { desc: "Growth ↓ · Inflation ↑", color: "from-rose-500/20 to-red-900/10" },
  deflation: { desc: "Growth ↓ · Inflation ↓", color: "from-blue-500/20 to-blue-900/10" },
};

export function RegimeBanner({ regime }: { regime: MacroRegimeBlock }) {
  const q = QUADRANT_COPY[regime.overall] ?? QUADRANT_COPY.goldilocks!;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br p-6 shadow-[0_0_40px_rgba(26, 115, 232,0.08)]",
        q.color,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-primary">{regime.title}</p>
          <h2 className="mt-2 font-heading text-2xl md:text-3xl">Current macro regime</h2>
          <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
          <p className="mt-3 inline-flex rounded-full border border-primary/40 bg-background/40 px-3 py-1 text-sm text-primary">
            {regime.overallLabel}
          </p>
        </div>
        <Link href="/macro/regime" className="text-sm text-primary hover:underline">
          Regime history →
        </Link>
      </div>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {regime.signals.map((s) => (
          <li
            key={s.dimension}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 backdrop-blur-sm"
          >
            <span className="text-lg" aria-hidden>{s.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {s.label}: <span className="text-foreground/90">{s.status}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
