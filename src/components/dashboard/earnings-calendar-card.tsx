"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface EarningsItem {
  id: string;
  company: string;
  period: "TODAY" | "TOMORROW" | "THIS WEEK";
  timing: "After Market" | "Before Market" | "During Hours";
  lastRevenue: string;
  eps: string;
  previousSurprise: string;
  expectedResult: string;
  portfolioWeight: string;
}

const EARNINGS_DATA: EarningsItem[] = [
  {
    id: "e-1",
    company: "TCS",
    period: "TODAY",
    timing: "After Market",
    lastRevenue: "₹64,259 Cr",
    eps: "₹33.2",
    previousSurprise: "+2.4%",
    expectedResult: "₹65,400 Cr (+3.1% YoY)",
    portfolioWeight: "7.8%",
  },
  {
    id: "e-2",
    company: "Reliance",
    period: "TOMORROW",
    timing: "Before Market",
    lastRevenue: "₹2,35,481 Cr",
    eps: "₹28.4",
    previousSurprise: "+1.8%",
    expectedResult: "₹2,42,000 Cr (Jio ARPU expansion)",
    portfolioWeight: "9.4%",
  },
  {
    id: "e-3",
    company: "HDFC Bank",
    period: "TOMORROW",
    timing: "After Market",
    lastRevenue: "₹85,182 Cr (NII)",
    eps: "₹21.6",
    previousSurprise: "+3.2%",
    expectedResult: "₹88,200 Cr (LDR compression)",
    portfolioWeight: "11.2%",
  },
  {
    id: "e-4",
    company: "Infosys",
    period: "THIS WEEK",
    timing: "After Market",
    lastRevenue: "₹40,986 Cr",
    eps: "₹15.8",
    previousSurprise: "+0.9%",
    expectedResult: "₹41,800 Cr (Guidance upgrade watch)",
    portfolioWeight: "5.6%",
  },
  {
    id: "e-5",
    company: "Asian Paints",
    period: "THIS WEEK",
    timing: "Before Market",
    lastRevenue: "₹9,103 Cr",
    eps: "₹12.4",
    previousSurprise: "-1.5%",
    expectedResult: "₹9,350 Cr (Crude margin impact)",
    portfolioWeight: "3.1%",
  },
  {
    id: "e-6",
    company: "Bajaj Finance",
    period: "THIS WEEK",
    timing: "After Market",
    lastRevenue: "₹14,928 Cr",
    eps: "₹58.1",
    previousSurprise: "+4.1%",
    expectedResult: "₹16,100 Cr (AUM growth +28%)",
    portfolioWeight: "4.5%",
  },
];

export function EarningsCalendarCard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"ALL" | "TODAY" | "TOMORROW" | "THIS WEEK">(
    "ALL",
  );

  const periods: ("TODAY" | "TOMORROW" | "THIS WEEK")[] = ["TODAY", "TOMORROW", "THIS WEEK"];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              EARNINGS CALENDAR
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-0.5">
            Institutional Earnings & Surprise Expectations
          </h3>
        </div>

        <Link
          href="/research"
          className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
        >
          View All Desk
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {periods.map((p) => {
          const items = EARNINGS_DATA.filter((e) => e.period === p);
          if (items.length === 0) return null;
          return (
            <div key={p} className="space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-b border-border/40 pb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{p}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-card/50 p-3.5 space-y-2 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{item.company}</span>
                        <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {item.timing}
                        </span>
                      </div>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        Weight: {item.portfolioWeight}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Last Rev:</span>
                        <span className="font-semibold text-foreground">{item.lastRevenue}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Last EPS:</span>
                        <span className="font-semibold text-foreground">{item.eps}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Surprise:</span>
                        <span className="font-semibold text-emerald-400">{item.previousSurprise}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Expected:</span>
                        <span className="font-semibold text-foreground truncate block">
                          {item.expectedResult}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
