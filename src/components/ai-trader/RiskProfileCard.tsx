"use client";

import type { RiskProfile, RiskLevel } from "@/lib/ai-trader/api";
import { cn } from "@/lib/utils";
import { riskActiveBg } from "@/lib/ai-trader/algo-brand";

interface Props {
  level: RiskLevel;
  profile: RiskProfile;
  active: boolean;
  onSelect: (l: RiskLevel) => void;
}

export default function RiskProfileCard({ level, profile, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      className={cn(
        "w-full rounded-xl border bg-card p-4 text-left transition-all",
        active ? cn("border-primary shadow-sm ring-2 ring-primary/20") : "border-border hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "mb-3 text-xs font-bold uppercase tracking-wide",
          active ? (level === "low" ? "text-chart-1" : level === "medium" ? "text-chart-3" : "text-chart-2") : "text-muted-foreground",
        )}
      >
        {level} — {profile.name}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {[
          ["Lot size", profile.base_lot_size],
          ["Lot mult", `×${profile.lot_multiplier}`],
          ["SL", `${(profile.sl_pct * 100).toFixed(0)}%`],
          ["Target", `${(profile.tgt_pct * 100).toFixed(0)}%`],
          ["Min score", `${(profile.score_threshold * 100).toFixed(0)}%`],
          ["Max trades", profile.max_trades_day],
          ["Max premium", `₹${profile.max_premium}`],
          ["Capital/trade", `${(profile.max_capital_per_trade * 100).toFixed(0)}%`],
        ].map(([k, v]) => (
          <div key={String(k)} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
      {active ? (
        <span className={cn("mt-3 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase", riskActiveBg(level))}>
          Selected
        </span>
      ) : null}
    </button>
  );
}
