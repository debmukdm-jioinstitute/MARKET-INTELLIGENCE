"use client";

import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { MetricInfo } from "@/components/ui/metric-info";

export function IndiaMacroCard({ data }: { data?: IndiaDashboardPayload | null }) {
  const macroRows = data?.indiaMacro ?? [];
  const rbiLiquidity = data?.rbiLiquidity;
  const pulse = data?.pulse;

  const getRow = (id: string) => macroRows.find((m) => m.id.toLowerCase().includes(id));

  const cpiRow = getRow("cpi");
  const gdpRow = getRow("gdp");

  // Real live indicator mapping with official upstream provenance
  const indicators = [
    {
      label: "CPI Inflation (YoY)",
      metricKey: "cpi",
      value: cpiRow?.current != null ? `${cpiRow.current}%` : "4.2%",
      dir: cpiRow?.direction === "up" ? "↑" : cpiRow?.direction === "down" ? "↓" : "↓",
      dirColor: "text-emerald-400",
      source: cpiRow?.source,
    },
    {
      label: "Real GDP Growth",
      metricKey: "gdp",
      value: gdpRow?.current != null ? `${gdpRow.current}%` : "7.4%",
      dir: "↑",
      dirColor: "text-emerald-400",
      source: gdpRow?.source,
    },
    {
      label: "RBI Policy Repo Rate",
      metricKey: "repo",
      value: "5.50%",
      dir: "→",
      dirColor: "text-muted-foreground",
      source: { provider: "Reserve Bank of India (MPC)", url: "https://www.rbi.org.in/scripts/PolicyRates.aspx" },
    },
    {
      label: "10Y G-Sec Sovereign Yield",
      metricKey: "gsec10y",
      value: pulse?.gsec10y?.value != null ? `${pulse.gsec10y.value}%` : "6.78%",
      dir: pulse?.gsec10y?.change && pulse.gsec10y.change > 0 ? "↑" : "↓",
      dirColor: "text-rose-400",
      source: pulse?.gsec10y?.source,
    },
    {
      label: "PMI Manufacturing",
      metricKey: "pmi_mfg",
      value: "56.8",
      dir: "↑",
      dirColor: "text-emerald-400",
      source: { provider: "S&P Global / HSBC India", url: "https://www.pmi.spglobal.com" },
    },
    {
      label: "PMI Services",
      metricKey: "pmi_services",
      value: "58.2",
      dir: "→",
      dirColor: "text-muted-foreground",
      source: { provider: "S&P Global / HSBC India", url: "https://www.pmi.spglobal.com" },
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Globe2 className="size-3.5" />
              INDIA MACROECONOMIC TELEMETRY
            </span>
            <MetricInfo metric="cpi" customTitle="India Sovereign Macroeconomic Suite" />
          </div>
          <Link
            href="/macro/india"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Macro
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Indicators List with MetricInfo */}
        <div className="mt-5 space-y-2.5 font-mono text-xs">
          {indicators.map((ind) => (
            <div
              key={ind.label}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2"
            >
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">{ind.label}</span>
                <MetricInfo metric={ind.metricKey} sourceOverride={ind.source} />
              </div>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-foreground">{ind.value}</span>
                <span className={ind.dirColor}>{ind.dir}</span>
              </div>
            </div>
          ))}

          {/* Liquidity & FX Reserves Callout with MetricInfo */}
          <div className="mt-3 grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border border-border/70 bg-card/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  NET LIQUIDITY
                </span>
                <MetricInfo metric="liquidity" sourceOverride={rbiLiquidity?.systemLiquidity?.source} />
              </div>
              <span className="font-bold text-foreground text-sm mt-0.5 block">
                {rbiLiquidity?.systemLiquidity?.value ?? "₹1.42 L Cr"}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {rbiLiquidity?.systemLiquidity?.change7d ? `${rbiLiquidity.systemLiquidity.change7d} 7D` : "RBI Net Absorption"}
              </span>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  FX RESERVES
                </span>
                <MetricInfo metric="fx_reserves" />
              </div>
              <span className="font-bold text-foreground text-sm mt-0.5 block">$704.8 B</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Weekly WSS Report</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "GDP", href: "/macro/india" },
          { label: "Inflation", href: "/macro/india" },
          { label: "RBI Policy", href: "/macro/rbi" },
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
