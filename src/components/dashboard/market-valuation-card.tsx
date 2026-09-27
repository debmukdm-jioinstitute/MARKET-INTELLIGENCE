"use client";

import Link from "next/link";
import { ArrowUpRight, Scale } from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";

export function MarketValuationCard() {
  const { data, loading } = useIndiaDashboard(60_000);
  const gsec = data?.pulse?.gsec10y?.value;
  const nseSource = {
    provider: "NSE India (Index PE/PB/Yield Reports)",
    url: "https://www.nseindia.com/reports-indices-historical-pepb",
  };

  return (
    <div className="bento-card-shell bento-card-stack bg-gradient-to-b from-card to-card/60">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Scale className="size-3.5" />
              MARKET VALUATION MULTIPLES
            </span>
            <MetricInfo metric="pe_ratio" sourceOverride={nseSource} customTitle="NSE Valuation Suite" />
          </div>
          <a
            href={nseSource.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            NSE PE/PB report
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>

        {loading && !data ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-3 space-y-4 text-sm">
            <p className="rounded-lg border border-dashed border-border bg-card/40 p-3 text-muted-foreground">
              Index P/E, P/B and dividend yield are not scraped here yet — use the official NSE historical PE/PB report. India 10Y G-Sec below comes from the live dashboard feed.
            </p>

            <div className="rounded-xl border border-border/70 bg-card/50 p-3.5 space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-foreground font-semibold">NIFTY 50 Trailing P/E</span>
                  <MetricInfo metric="pe_ratio" sourceOverride={nseSource} />
                </div>
                <span className="font-bold text-base text-muted-foreground">See NSE report</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase">NIFTY P/B</span>
                  <MetricInfo metric="pb_ratio" sourceOverride={nseSource} />
                </div>
                <span className="font-bold text-muted-foreground text-sm mt-0.5 block">—</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase">Index dividend yield</span>
                  <MetricInfo metric="div_yield" sourceOverride={nseSource} />
                </div>
                <span className="font-bold text-muted-foreground text-sm mt-0.5 block">—</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/40 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">India 10Y G-Sec (live)</span>
                  <MetricInfo metric="gsec10y" sourceOverride={data?.pulse?.gsec10y?.source} />
                </div>
                <span className="font-bold text-foreground tabular-nums">
                  {gsec != null ? `${gsec.toFixed(2)}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-sm">
        <Link href="/macro/india" className="text-primary hover:underline text-sm">
          India macro & G-Sec context →
        </Link>
      </div>
    </div>
  );
}
