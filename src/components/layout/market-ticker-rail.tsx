"use client";

import Link from "next/link";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TickerItem {
  id: string;
  name: string;
  symbol: string;
  route: string;
  price: number;
  changePct: number;
  prefix?: string;
  suffix?: string;
  isLive?: boolean;
}

export function MarketTickerRail() {
  const { data } = useIndiaDashboard(45_000);
  const pulse = data?.pulse;
  const radar = data?.globalRadar;

  // Real or canonical fallback data
  const tickers: TickerItem[] = [
    {
      id: "nifty50",
      name: "NIFTY 50",
      symbol: "^NSEI",
      route: "/markets/india/nifty50",
      price: pulse?.nifty?.value ?? 25431.2,
      changePct: pulse?.nifty?.changePct ?? 0.0072,
      isLive: Boolean(pulse?.nifty?.value),
    },
    {
      id: "sensex",
      name: "SENSEX",
      symbol: "^BSESN",
      route: "/markets/india/sensex",
      price: pulse?.sensex?.value ?? 83821.15,
      changePct: pulse?.sensex?.changePct ?? 0.0061,
      isLive: Boolean(pulse?.sensex?.value),
    },
    {
      id: "banknifty",
      name: "BANK NIFTY",
      symbol: "^NSEBANK",
      route: "/markets/india/banknifty",
      price: pulse?.bankNifty?.value ?? 54120.4,
      changePct: pulse?.bankNifty?.changePct ?? 0.0112,
      isLive: Boolean(pulse?.bankNifty?.value),
    },
    {
      id: "vix",
      name: "INDIA VIX",
      symbol: "^INDIAVIX",
      route: "/markets/india/vix",
      price: pulse?.indiaVix?.value ?? 14.82,
      changePct: pulse?.indiaVix?.changePct ?? -0.032,
      isLive: Boolean(pulse?.indiaVix?.value),
    },
    {
      id: "usdinr",
      name: "USD/INR",
      symbol: "INR=X",
      route: "/markets/india/usdinr",
      price: pulse?.usdInr?.value ?? 87.21,
      changePct: pulse?.usdInr?.changePct ?? 0.0014,
      prefix: "₹",
      isLive: Boolean(pulse?.usdInr?.value),
    },
    {
      id: "brent",
      name: "BRENT",
      symbol: "BZ=F",
      route: "/markets/india/brent",
      price: pulse?.brent?.value ?? 72.4,
      changePct: pulse?.brent?.changePct ?? 0.011,
      prefix: "$",
      isLive: Boolean(pulse?.brent?.value),
    },
    {
      id: "gold",
      name: "GOLD",
      symbol: "GC=F",
      route: "/markets/india/gold",
      price: pulse?.gold?.value ?? 3421.0,
      changePct: pulse?.gold?.changePct ?? 0.008,
      prefix: "$",
      isLive: Boolean(pulse?.gold?.value),
    },
    {
      id: "silver",
      name: "SILVER",
      symbol: "SI=F",
      route: "/markets/india/silver",
      price: radar?.["SI=F"]?.value ?? 38.21,
      changePct: radar?.["SI=F"]?.changePct ?? 0.017,
      prefix: "$",
      isLive: Boolean(radar?.["SI=F"]?.value),
    },
    {
      id: "copper",
      name: "COPPER",
      symbol: "HG=F",
      route: "/markets/india/copper",
      price: radar?.["HG=F"]?.value ?? 4.42,
      changePct: radar?.["HG=F"]?.changePct ?? -0.004,
      prefix: "$",
      isLive: Boolean(radar?.["HG=F"]?.value),
    },
    {
      id: "dxy",
      name: "DXY",
      symbol: "DX-Y.NYB",
      route: "/markets/india/dxy",
      price: radar?.["DX-Y.NYB"]?.value ?? 101.4,
      changePct: radar?.["DX-Y.NYB"]?.changePct ?? -0.0022,
      isLive: Boolean(radar?.["DX-Y.NYB"]?.value),
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
          <span className="hidden sm:inline">LIVE RAIL</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1">
          {tickers.map((t) => {
            const isPos = t.changePct >= 0;
            return (
              <Link
                key={t.id}
                href={t.route}
                className="group flex items-center gap-2 rounded px-2.5 py-1 transition-all hover:bg-accent/70 shrink-0 select-none"
                title={`View ${t.name} institutional cockpit`}
              >
                <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {t.name}
                </span>
                <span className="font-medium text-foreground">
                  {t.prefix ?? ""}
                  {t.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  {t.suffix ?? ""}
                </span>
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
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
