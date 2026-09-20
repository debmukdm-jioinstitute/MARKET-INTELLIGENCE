"use client";

import Link from "next/link";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MetricInfo } from "@/components/ui/metric-info";

interface TickerItem {
  id: string;
  metricKey: string;
  name: string;
  symbol: string;
  route: string;
  price?: number | null;
  changePct?: number | null;
  prefix?: string;
  suffix?: string;
  source?: { provider: string; url: string; asOf?: string };
}

export function MarketTickerRail() {
  const { data } = useIndiaDashboard(45_000);
  const pulse = data?.pulse;
  const radar = data?.globalRadar;

  // Real live stream data from official exchange/API feeds
  const tickers: TickerItem[] = [
    {
      id: "nifty50",
      metricKey: "nifty50",
      name: "NIFTY 50",
      symbol: "^NSEI",
      route: "/markets/india/nifty50",
      price: pulse?.nifty?.value,
      changePct: pulse?.nifty?.changePct,
      source: pulse?.nifty?.source,
    },
    {
      id: "sensex",
      metricKey: "sensex",
      name: "SENSEX",
      symbol: "^BSESN",
      route: "/markets/india/sensex",
      price: pulse?.sensex?.value,
      changePct: pulse?.sensex?.changePct,
      source: pulse?.sensex?.source,
    },
    {
      id: "banknifty",
      metricKey: "banknifty",
      name: "BANK NIFTY",
      symbol: "^NSEBANK",
      route: "/markets/india/banknifty",
      price: pulse?.bankNifty?.value,
      changePct: pulse?.bankNifty?.changePct,
      source: pulse?.bankNifty?.source,
    },
    {
      id: "vix",
      metricKey: "vix",
      name: "INDIA VIX",
      symbol: "^INDIAVIX",
      route: "/markets/india/vix",
      price: pulse?.indiaVix?.value,
      changePct: pulse?.indiaVix?.changePct,
      source: pulse?.indiaVix?.source,
    },
    {
      id: "usdinr",
      metricKey: "usdinr",
      name: "USD/INR",
      symbol: "INR=X",
      route: "/markets/india/usdinr",
      price: pulse?.usdInr?.value,
      changePct: pulse?.usdInr?.changePct,
      prefix: "₹",
      source: pulse?.usdInr?.source,
    },
    {
      id: "brent",
      metricKey: "brent",
      name: "BRENT",
      symbol: "BZ=F",
      route: "/markets/india/brent",
      price: pulse?.brent?.value,
      changePct: pulse?.brent?.changePct,
      prefix: "$",
      source: pulse?.brent?.source,
    },
    {
      id: "gold",
      metricKey: "gold",
      name: "GOLD",
      symbol: "GC=F",
      route: "/markets/india/gold",
      price: pulse?.gold?.value,
      changePct: pulse?.gold?.changePct,
      prefix: "$",
      source: pulse?.gold?.source,
    },
    {
      id: "silver",
      metricKey: "gold",
      name: "SILVER",
      symbol: "SI=F",
      route: "/markets/india/silver",
      price: radar?.["SI=F"]?.value,
      changePct: radar?.["SI=F"]?.changePct,
      prefix: "$",
      source: radar?.["SI=F"]?.source,
    },
    {
      id: "copper",
      metricKey: "brent",
      name: "COPPER",
      symbol: "HG=F",
      route: "/markets/india/copper",
      price: radar?.["HG=F"]?.value,
      changePct: radar?.["HG=F"]?.changePct,
      prefix: "$",
      source: radar?.["HG=F"]?.source,
    },
    {
      id: "dxy",
      metricKey: "dxy",
      name: "DXY",
      symbol: "DX-Y.NYB",
      route: "/markets/india/dxy",
      price: radar?.["DX-Y.NYB"]?.value,
      changePct: radar?.["DX-Y.NYB"]?.changePct,
      source: radar?.["DX-Y.NYB"]?.source,
    },
  ];

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/95 shadow-sm backdrop-blur-md">
      <div className="flex items-center overflow-x-auto py-1.5 px-3 text-[11px] font-mono scrollbar-none divide-x divide-border/60">
        <div className="flex items-center gap-1.5 pr-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground shrink-0 select-none">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">LIVE STREAM</span>
          <MetricInfo metric="nifty50" customTitle="Market Ticker Rail Ingestion Engine" />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1">
          {tickers.map((t) => {
            const hasData = t.price != null;
            const isPos = (t.changePct ?? 0) >= 0;
            return (
              <div
                key={t.id}
                className="group flex items-center gap-1.5 rounded px-2 py-0.5 hover:bg-accent/70 shrink-0 select-none transition-colors"
              >
                <Link
                  href={t.route}
                  className="flex items-center gap-1.5"
                  title={`Open ${t.name} institutional cockpit`}
                >
                  <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {t.name}
                  </span>
                  <span className="font-medium text-foreground">
                    {hasData ? (
                      <>
                        {t.prefix ?? ""}
                        {t.price!.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        {t.suffix ?? ""}
                      </>
                    ) : (
                      "Connecting…"
                    )}
                  </span>
                  {t.changePct != null ? (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold",
                        isPos
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-rose-400 bg-rose-500/10",
                      )}
                    >
                      {isPos ? "+" : ""}
                      {formatPct(t.changePct)}
                    </span>
                  ) : null}
                </Link>
                <MetricInfo metric={t.metricKey} sourceOverride={t.source} customTitle={t.name} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
