"use client";

import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

export function IndiaMacroCard({ data }: { data?: IndiaDashboardPayload | null }) {
  const macroRows = data?.indiaMacro ?? [];
  const rbiLiquidity = data?.rbiLiquidity;

  const getVal = (id: string, def: string) => {
    const row = macroRows.find((m) => m.id.toLowerCase().includes(id));
    return row?.current ? `${row.current}${row.unit ? " " + row.unit : ""}` : def;
  };

  const indicators = [
    { label: "CPI Inflation", value: getVal("cpi", "4.2%"), dir: "↓", dirColor: "text-emerald-400" },
    { label: "Real GDP Growth", value: getVal("gdp", "7.4%"), dir: "↑", dirColor: "text-emerald-400" },
    { label: "RBI Repo Rate", value: "5.50%", dir: "→", dirColor: "text-muted-foreground" },
    { label: "10Y G-Sec Yield", value: "6.82%", dir: "↑", dirColor: "text-rose-400" },
    { label: "PMI Manufacturing", value: "56.8", dir: "↑", dirColor: "text-emerald-400" },
    { label: "PMI Services", value: "58.2", dir: "→", dirColor: "text-muted-foreground" },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Globe2 className="size-3.5" />
              INDIA MACRO
            </span>
          </div>
          <Link
            href="/macro/india"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Macro
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Indicators List */}
        <div className="mt-5 space-y-2.5 font-mono text-xs">
          {indicators.map((ind) => (
            <div
              key={ind.label}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2"
            >
              <span className="text-muted-foreground">{ind.label}</span>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-foreground">{ind.value}</span>
                <span className={ind.dirColor}>{ind.dir}</span>
              </div>
            </div>
          ))}

          {/* Liquidity & FX Reserves Callout */}
          <div className="mt-3 grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border border-border/70 bg-card/50 p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                NET LIQUIDITY
              </span>
              <span className="font-bold text-foreground text-sm mt-0.5 block">
                {rbiLiquidity?.systemLiquidity?.value ?? "₹1.42 L Cr"}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">+₹18K Cr (Surplus)</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/50 p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                FX RESERVES
              </span>
              <span className="font-bold text-foreground text-sm mt-0.5 block">$704.8 B</span>
              <span className="text-[10px] text-emerald-400 font-semibold">+0.3% ($+2.1B)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "GDP", href: "/macro/india" },
          { label: "Inflation", href: "/macro/india" },
          { label: "RBI Stance", href: "/macro/rbi" },
          { label: "Liquidity", href: "/macro/liquidity" },
          { label: "Calendar", href: "/macro/calendar" },
        ].map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            className="rounded border border-border/70 bg-accent/20 px-2 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {sub.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
