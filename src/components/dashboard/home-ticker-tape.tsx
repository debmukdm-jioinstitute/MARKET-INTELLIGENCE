"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { cn } from "@/lib/utils";

interface HomeTickerTapeProps {
  data?: IndiaDashboardPayload | null;
}

interface TapeItem {
  id: string;
  name: string;
  value: string;
  change: string;
  isUp: boolean;
  neutral?: boolean;
  href: string;
  category: "DOMESTIC" | "GLOBAL" | "MACRO" | "COMMODITY";
}

export function HomeTickerTape({ data }: HomeTickerTapeProps) {
  const pulse = data?.pulse;
  const radar = data?.globalRadar;

  const spx = radar?.sp500 ?? radar?.["^GSPC"];
  const ndx = radar?.nasdaq ?? radar?.["^IXIC"];
  const us10y = radar?.us10y ?? radar?.["^TNX"];

  const items: TapeItem[] = [
    {
      id: "nifty",
      name: "NIFTY 50",
      value: pulse?.nifty?.value ? pulse.nifty.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—",
      change: pulse?.nifty?.changePct != null ? `${pulse.nifty.changePct >= 0 ? "+" : ""}${pulse.nifty.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.nifty?.changePct ?? 0) >= 0,
      neutral: pulse?.nifty?.changePct == null,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "sensex",
      name: "SENSEX",
      value: pulse?.sensex?.value ? pulse.sensex.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—",
      change: pulse?.sensex?.changePct != null ? `${pulse.sensex.changePct >= 0 ? "+" : ""}${pulse.sensex.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.sensex?.changePct ?? 0) >= 0,
      neutral: pulse?.sensex?.changePct == null,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "banknifty",
      name: "BANK NIFTY",
      value: pulse?.bankNifty?.value ? pulse.bankNifty.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—",
      change: pulse?.bankNifty?.changePct != null ? `${pulse.bankNifty.changePct >= 0 ? "+" : ""}${pulse.bankNifty.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.bankNifty?.changePct ?? 0) >= 0,
      neutral: pulse?.bankNifty?.changePct == null,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "vix",
      name: "INDIA VIX",
      value: pulse?.indiaVix?.value ? pulse.indiaVix.value.toFixed(2) : "—",
      change: pulse?.indiaVix?.changePct != null ? `${pulse.indiaVix.changePct >= 0 ? "+" : ""}${pulse.indiaVix.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.indiaVix?.changePct ?? 0) < 0, // lower VIX is green for equity
      neutral: pulse?.indiaVix?.changePct == null,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "sp500",
      name: "S&P 500",
      value: spx?.value ? spx.value.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "—",
      change: spx?.changePct != null ? `${spx.changePct >= 0 ? "+" : ""}${spx.changePct.toFixed(2)}%` : "—",
      isUp: (spx?.changePct ?? 0) >= 0,
      neutral: spx?.changePct == null,
      href: "/macro/indices",
      category: "GLOBAL",
    },
    {
      id: "nasdaq",
      name: "NASDAQ 100",
      value: ndx?.value ? ndx.value.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "—",
      change: ndx?.changePct != null ? `${ndx.changePct >= 0 ? "+" : ""}${ndx.changePct.toFixed(2)}%` : "—",
      isUp: (ndx?.changePct ?? 0) >= 0,
      neutral: ndx?.changePct == null,
      href: "/macro/indices",
      category: "GLOBAL",
    },
    {
      id: "gsec10y",
      name: "IN 10Y G-SEC",
      value: pulse?.gsec10y?.value ? `${pulse.gsec10y.value.toFixed(2)}%` : "—",
      change: "Neutral",
      isUp: true,
      neutral: true,
      href: "/macro/yields",
      category: "MACRO",
    },
    {
      id: "us10y",
      name: "US 10Y YIELD",
      value: us10y?.value ? `${us10y.value.toFixed(2)}%` : "—",
      change: us10y?.changePct != null ? `${us10y.changePct >= 0 ? "+" : ""}${us10y.changePct.toFixed(2)}%` : "—",
      isUp: (us10y?.changePct ?? 0) <= 0,
      neutral: us10y?.changePct == null,
      href: "/macro/yields",
      category: "MACRO",
    },
    {
      id: "usdinr",
      name: "USD / INR",
      value: pulse?.usdInr?.value ? `₹${pulse.usdInr.value.toFixed(2)}` : "—",
      change: pulse?.usdInr?.changePct != null ? `${pulse.usdInr.changePct >= 0 ? "+" : ""}${pulse.usdInr.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.usdInr?.changePct ?? 0) <= 0, // lower USDINR is stronger Rupee
      neutral: pulse?.usdInr?.changePct == null,
      href: "/macro/currency",
      category: "COMMODITY",
    },
    {
      id: "brent",
      name: "BRENT CRUDE",
      value: pulse?.brent?.value ? `$${pulse.brent.value.toFixed(2)}` : "—",
      change: pulse?.brent?.changePct != null ? `${pulse.brent.changePct >= 0 ? "+" : ""}${pulse.brent.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.brent?.changePct ?? 0) <= 0, // lower crude is positive for India
      neutral: pulse?.brent?.changePct == null,
      href: "/macro/commodities",
      category: "COMMODITY",
    },
    {
      id: "gold",
      name: "MCX GOLD",
      value: pulse?.gold?.value ? `₹${pulse.gold.value.toLocaleString("en-IN")}` : "—",
      change: pulse?.gold?.changePct != null ? `${pulse.gold.changePct >= 0 ? "+" : ""}${pulse.gold.changePct.toFixed(2)}%` : "—",
      isUp: (pulse?.gold?.changePct ?? 0) >= 0,
      neutral: pulse?.gold?.changePct == null,
      href: "/macro/commodities",
      category: "COMMODITY",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/70 py-2 px-2.5 sm:px-3 shadow-xs backdrop-blur-xs">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-scroll">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/70 pr-2 sm:pr-3 mr-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Activity className="size-3.5 text-emerald-500 animate-pulse" />
          <span>Live Pulse</span>
        </div>

        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex min-h-[36px] shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg border border-border/50 bg-background/60 px-2 sm:px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-accent/50 touch-manipulation active:scale-[0.98]"
          >
            <span className="font-semibold text-muted-foreground group-hover:text-foreground text-[11px] sm:text-xs">
              {item.name}
            </span>
            <span className="font-medium text-foreground tabular-nums text-[11px] sm:text-xs">
              {item.value}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold tabular-nums",
                item.neutral
                  ? "bg-muted text-muted-foreground"
                  : item.isUp
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {!item.neutral && (
                item.isUp ? (
                  <TrendingUp className="size-3 shrink-0" />
                ) : (
                  <TrendingDown className="size-3 shrink-0" />
                )
              )}
              {item.change}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
