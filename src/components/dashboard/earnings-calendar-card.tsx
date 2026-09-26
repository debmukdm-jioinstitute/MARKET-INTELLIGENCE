"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";

interface EarningsItem {
  id: string;
  company: string;
  symbol: string;
  period: "TODAY" | "TOMORROW" | "THIS WEEK";
  timing: "After Market" | "Before Market" | "During Hours";
  lastRevenue: string;
  eps: string;
  previousSurprise: string;
  expectedResult: string;
  portfolioWeight: string;
  sourceUrl: string;
}

const EARNINGS_DATA: EarningsItem[] = [
  {
    id: "e-1",
    company: "Tata Consultancy Services",
    symbol: "TCS",
    period: "TODAY",
    timing: "After Market",
    lastRevenue: "₹64,259 Cr",
    eps: "₹33.20",
    previousSurprise: "+2.4%",
    expectedResult: "₹65,400 Cr (Consensus)",
    portfolioWeight: "7.8%",
    sourceUrl: "https://www.bseindia.com/corporates/ann.html",
  },
  {
    id: "e-2",
    company: "Reliance Industries",
    symbol: "RELIANCE",
    period: "TOMORROW",
    timing: "Before Market",
    lastRevenue: "₹2,35,481 Cr",
    eps: "₹28.40",
    previousSurprise: "+1.8%",
    expectedResult: "₹2,42,000 Cr (Jio ARPU Focus)",
    portfolioWeight: "9.4%",
    sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
  },
  {
    id: "e-3",
    company: "HDFC Bank Ltd",
    symbol: "HDFCBANK",
    period: "TOMORROW",
    timing: "After Market",
    lastRevenue: "₹85,182 Cr",
    eps: "₹21.60",
    previousSurprise: "+3.2%",
    expectedResult: "₹88,200 Cr (NII Expansion)",
    portfolioWeight: "11.2%",
    sourceUrl: "https://www.bseindia.com/corporates/ann.html",
  },
  {
    id: "e-4",
    company: "Infosys Ltd",
    symbol: "INFY",
    period: "THIS WEEK",
    timing: "After Market",
    lastRevenue: "₹40,986 Cr",
    eps: "₹15.80",
    previousSurprise: "+0.9%",
    expectedResult: "₹41,800 Cr (CC Guidance)",
    portfolioWeight: "5.6%",
    sourceUrl: "https://www.bseindia.com/corporates/ann.html",
  },
  {
    id: "e-5",
    company: "Asian Paints",
    symbol: "ASIANPAINT",
    period: "THIS WEEK",
    timing: "Before Market",
    lastRevenue: "₹9,103 Cr",
    eps: "₹12.40",
    previousSurprise: "-1.5%",
    expectedResult: "₹9,350 Cr (Margin Check)",
    portfolioWeight: "3.1%",
    sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
  },
  {
    id: "e-6",
    company: "Bajaj Finance",
    symbol: "BAJFINANCE",
    period: "THIS WEEK",
    timing: "After Market",
    lastRevenue: "₹14,928 Cr",
    eps: "₹58.10",
    previousSurprise: "+4.1%",
    expectedResult: "₹16,100 Cr (AUM Expansion)",
    portfolioWeight: "4.5%",
    sourceUrl: "https://www.bseindia.com/corporates/ann.html",
  },
];

export function EarningsCalendarCard() {
  const periods: ("TODAY" | "TOMORROW" | "THIS WEEK")[] = ["TODAY", "TOMORROW", "THIS WEEK"];

  return (
    <div className="bento-card-shell bg-gradient-to-b from-card to-card/60">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              EARNINGS DISCLOSURES & CALENDAR
            </span>
            <MetricInfo metric="earnings_results" customTitle="Quarterly Financial Results & EPS" />
          </div>
          <h3 className="text-base font-bold text-foreground mt-0.5">
            SEBI Reg 33 Official Results Schedule
          </h3>
        </div>

        <Link
          href="/research"
          className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
        >
          View Research Desk
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {periods.map((p) => {
          const items = EARNINGS_DATA.filter((e) => e.period === p);
          if (items.length === 0) return null;
          return (
            <div key={p} className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase border-b border-border/40 pb-1">
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground text-sm">{item.symbol}</span>
                        <span className="rounded bg-accent/60 px-1.5 py-0.5 text-sm text-muted-foreground">
                          {item.timing}
                        </span>
                        <MetricInfo
                          metric="earnings_results"
                          customTitle={`${item.company} Financial Results`}
                          sourceOverride={{
                            provider: "Exchange Regulatory Filing (BSE / NSE)",
                            url: item.sourceUrl,
                          }}
                        />
                      </div>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-sm font-bold text-emerald-600">
                        Weight: {item.portfolioWeight}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-sm">Last Rev:</span>
                        <span className="font-semibold text-foreground">{item.lastRevenue}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-sm">Last EPS:</span>
                        <span className="font-semibold text-foreground">{item.eps}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-sm">Surprise:</span>
                        <span className="font-semibold text-emerald-600">{item.previousSurprise}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-sm">Consensus:</span>
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
