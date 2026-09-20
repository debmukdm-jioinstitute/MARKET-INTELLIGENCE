"use client";

import Link from "next/link";
import { ArrowUpRight, Coins } from "lucide-react";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

interface CommoditiesFxCardProps {
  data?: IndiaDashboardPayload | null;
}

export function CommoditiesFxCard({ data }: CommoditiesFxCardProps) {
  const pulse = data?.pulse;
  const radar = data?.globalRadar;

  const commodities = [
    {
      name: "BRENT CRUDE",
      category: "Energy",
      price: pulse?.brent?.value ?? 72.4,
      changePct: pulse?.brent?.changePct ?? 0.012,
      prefix: "$",
      route: "/markets/india/brent",
    },
    {
      name: "GOLD",
      category: "Precious Metals",
      price: pulse?.gold?.value ?? 3421.0,
      changePct: pulse?.gold?.changePct ?? 0.008,
      prefix: "$",
      route: "/markets/india/gold",
    },
    {
      name: "SILVER",
      category: "Precious Metals",
      price: radar?.["SI=F"]?.value ?? 38.21,
      changePct: radar?.["SI=F"]?.changePct ?? 0.017,
      prefix: "$",
      route: "/markets/india/silver",
    },
    {
      name: "COPPER",
      category: "Industrial Metals",
      price: radar?.["HG=F"]?.value ?? 4.42,
      changePct: radar?.["HG=F"]?.changePct ?? -0.004,
      prefix: "$",
      route: "/markets/india/copper",
    },
  ];

  const currencies = [
    {
      name: "USD/INR",
      price: pulse?.usdInr?.value ?? 87.21,
      changePct: pulse?.usdInr?.changePct ?? 0.0014,
      prefix: "₹",
      route: "/markets/india/usdinr",
    },
    {
      name: "US DOLLAR INDEX (DXY)",
      price: radar?.["DX-Y.NYB"]?.value ?? 101.4,
      changePct: radar?.["DX-Y.NYB"]?.changePct ?? -0.0022,
      prefix: "",
      route: "/markets/india/dxy",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Coins className="size-3.5" />
              COMMODITIES & FX
            </span>
          </div>
          <Link
            href="/markets"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Markets
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {/* Commodities List */}
          <div className="space-y-1.5 font-mono text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              GLOBAL COMMODITIES
            </span>
            {commodities.map((c) => {
              const isPos = c.changePct >= 0;
              return (
                <Link
                  key={c.name}
                  href={c.route}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{c.category}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-foreground">
                      {c.prefix}
                      {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold",
                        isPos ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10",
                      )}
                    >
                      {isPos ? "+" : ""}
                      {formatPct(c.changePct)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* FX Currencies List */}
          <div className="space-y-1.5 font-mono text-xs pt-1 border-t border-border/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mt-2">
              FOREIGN EXCHANGE
            </span>
            {currencies.map((fx) => {
              const isPos = fx.changePct >= 0;
              return (
                <Link
                  key={fx.name}
                  href={fx.route}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <span className="font-semibold text-foreground">{fx.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-foreground">
                      {fx.prefix}
                      {fx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold",
                        isPos ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10",
                      )}
                    >
                      {isPos ? "+" : ""}
                      {formatPct(fx.changePct)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        <span className="text-[10px] text-muted-foreground">SECTOR SENSITIVITIES:</span>
        <span className="text-[10px] text-muted-foreground">Crude → Paints/OMCs</span>
        <span className="text-[10px] text-muted-foreground">· Copper → Cables/CapGoods</span>
      </div>
    </div>
  );
}
