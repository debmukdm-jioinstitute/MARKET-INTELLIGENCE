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
      value: pulse?.nifty?.value ? pulse.nifty.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "25,796.9",
      change: pulse?.nifty?.changePct != null ? `${pulse.nifty.changePct >= 0 ? "+" : ""}${pulse.nifty.changePct.toFixed(2)}%` : "+0.18%",
      isUp: (pulse?.nifty?.changePct ?? 0.18) >= 0,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "sensex",
      name: "SENSEX",
      value: pulse?.sensex?.value ? pulse.sensex.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "84,299.7",
      change: pulse?.sensex?.changePct != null ? `${pulse.sensex.changePct >= 0 ? "+" : ""}${pulse.sensex.changePct.toFixed(2)}%` : "+0.14%",
      isUp: (pulse?.sensex?.changePct ?? 0.14) >= 0,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "banknifty",
      name: "BANK NIFTY",
      value: pulse?.bankNifty?.value ? pulse.bankNifty.value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "52,978.2",
      change: pulse?.bankNifty?.changePct != null ? `${pulse.bankNifty.changePct >= 0 ? "+" : ""}${pulse.bankNifty.changePct.toFixed(2)}%` : "+0.32%",
      isUp: (pulse?.bankNifty?.changePct ?? 0.32) >= 0,
      href: "/markets/india",
      category: "DOMESTIC",
    },
    {
      id: "vix",
      name: "INDIA VIX",
      value: pulse?.indiaVix?.value ? pulse.indiaVix.value.toFixed(2) : "12.78",
      change: pulse?.indiaVix?.changePct != null ? `${pulse.indiaVix.changePct >= 0 ? "+" : ""}${pulse.indiaVix.changePct.toFixed(2)}%` : "-2.14%",
      isUp: (pulse?.indiaVix?.changePct ?? -2.14) < 0, // lower VIX is green for equity
      href: "/markets",
      category: "DOMESTIC",
    },
    {
      id: "sp500",
      name: "S&P 500",
      value: spx?.value ? spx.value.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "5,738.1",
      change: spx?.changePct != null ? `${spx.changePct >= 0 ? "+" : ""}${spx.changePct.toFixed(2)}%` : "+0.25%",
      isUp: (spx?.changePct ?? 0.25) >= 0,
      href: "/macro/indices",
      category: "GLOBAL",
    },
    {
      id: "nasdaq",
      name: "NASDAQ 100",
      value: ndx?.value ? ndx.value.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "18,189.4",
      change: ndx?.changePct != null ? `${ndx.changePct >= 0 ? "+" : ""}${ndx.changePct.toFixed(2)}%` : "+0.41%",
      isUp: (ndx?.changePct ?? 0.41) >= 0,
      href: "/macro/indices",
      category: "GLOBAL",
    },
    {
      id: "gsec10y",
      name: "IN 10Y G-SEC",
      value: pulse?.gsec10y?.value ? `${pulse.gsec10y.value.toFixed(2)}%` : "6.84%",
      change: "Neutral",
      isUp: true,
      neutral: true,
      href: "/macro/yields",
      category: "MACRO",
    },
    {
      id: "us10y",
      name: "US 10Y YIELD",
      value: us10y?.value ? `${us10y.value.toFixed(2)}%` : "3.78%",
      change: us10y?.changePct != null ? `${us10y.changePct >= 0 ? "+" : ""}${us10y.changePct.toFixed(2)}%` : "-0.04%",
      isUp: (us10y?.changePct ?? -0.04) <= 0,
      href: "/macro/yields",
      category: "MACRO",
    },
    {
      id: "usdinr",
      name: "USD / INR",
      value: pulse?.usdInr?.value ? `₹${pulse.usdInr.value.toFixed(2)}` : "₹83.82",
      change: pulse?.usdInr?.changePct != null ? `${pulse.usdInr.changePct >= 0 ? "+" : ""}${pulse.usdInr.changePct.toFixed(2)}%` : "+0.04%",
      isUp: (pulse?.usdInr?.changePct ?? 0.04) <= 0, // lower USDINR is stronger Rupee
      href: "/macro/currency",
      category: "COMMODITY",
    },
    {
      id: "brent",
      name: "BRENT CRUDE",
      value: pulse?.brent?.value ? `$${pulse.brent.value.toFixed(2)}` : "$71.60",
      change: pulse?.brent?.changePct != null ? `${pulse.brent.changePct >= 0 ? "+" : ""}${pulse.brent.changePct.toFixed(2)}%` : "-0.85%",
      isUp: (pulse?.brent?.changePct ?? -0.85) <= 0, // lower crude is positive for India
      href: "/macro/commodities",
      category: "COMMODITY",
    },
    {
      id: "gold",
      name: "MCX GOLD",
      value: pulse?.gold?.value ? `₹${pulse.gold.value.toLocaleString("en-IN")}` : "₹75,420",
      change: pulse?.gold?.changePct != null ? `${pulse.gold.changePct >= 0 ? "+" : ""}${pulse.gold.changePct.toFixed(2)}%` : "+0.45%",
      isUp: (pulse?.gold?.changePct ?? 0.45) >= 0,
      href: "/macro/commodities",
      category: "COMMODITY",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/70 py-2.5 px-3 shadow-xs backdrop-blur-xs">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/70 pr-3 mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Activity className="size-3.5 text-emerald-500 animate-pulse" />
          <span>Live Pulse</span>
        </div>

        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <span className="font-semibold text-muted-foreground group-hover:text-foreground">
              {item.name}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {item.value}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
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
