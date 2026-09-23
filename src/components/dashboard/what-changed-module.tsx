"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, History, ExternalLink, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricInfo } from "@/components/ui/metric-info";

interface ChangedItem {
  id: string;
  num: string;
  metricKey: string;
  headline: string;
  tag: string;
  tagColor: string;
  dataSummary: string;
  chartData: number[];
  sourceName: string;
  sourceUrl: string;
  methodology: string;
  relatedSecurities: { symbol: string; impact: string }[];
}

const ITEMS: ChangedItem[] = [
  {
    id: "item-1",
    num: "01",
    metricKey: "fii_flow",
    headline: "FII flows turned negative over the last 3 sessions.",
    tag: "INSTITUTIONAL FLOWS",
    tagColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    dataSummary:
      "Net FII selling totaled -₹4,812 Cr across cash equities over the last 3 trading days according to official exchange disclosure reports. Domestic Institutions (DIIs) provided strong counter-support with +₹5,140 Cr.",
    chartData: [1200, 850, 420, -1100, -1820, -1892],
    sourceName: "NSE FII/DII Daily Trading Activity Report",
    sourceUrl: "https://www.nseindia.com/reports/fii-dii",
    methodology:
      "Aggregated gross buys minus gross sells reported by custodian banks at the conclusion of each market session under SEBI regulatory guidelines.",
    relatedSecurities: [
      { symbol: "HDFCBANK", impact: "-0.8% net institutional outflow" },
      { symbol: "ICICIBANK", impact: "-0.4% marginal selling" },
      { symbol: "INFY", impact: "FII liquidation pressure" },
    ],
  },
  {
    id: "item-2",
    num: "02",
    metricKey: "gsec10y",
    headline: "10Y G-Sec yield moved 11 bps higher.",
    tag: "SOVEREIGN RATES",
    tagColor: "bg-blue-600/10 text-blue-600 border-blue-600/30",
    dataSummary:
      "India 10Y Benchmark Government Bond yield rose from 6.71% to 6.82% following hawkish commentary in RBI MPC minutes and higher US Treasury yield pass-through.",
    chartData: [6.71, 6.72, 6.74, 6.78, 6.8, 6.82],
    sourceName: "CCIL (Clearing Corporation of India) / RBI NDS-OM",
    sourceUrl: "https://www.ccilindia.com",
    methodology:
      "Volume-weighted average yield calculated across outright secondary market transactions conducted on the RBI NDS-OM platform.",
    relatedSecurities: [
      { symbol: "IN10YT=RR", impact: "Bond prices compressed -0.74%" },
      { symbol: "NIFTY PSU BANK", impact: "Treasury MTM gain impact" },
      { symbol: "REALTY", impact: "Higher borrowing cost expectation" },
    ],
  },
  {
    id: "item-3",
    num: "03",
    metricKey: "nifty50",
    headline: "IT sector underperformed NIFTY by 1.4%.",
    tag: "SECTOR DIVERGENCE",
    tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    dataSummary:
      "NIFTY IT index fell -0.68% while NIFTY 50 advanced +0.72%, creating a 140 bps negative relative spread driven by cautious discretionary spending commentary in global tech verticals.",
    chartData: [100, 99.4, 99.1, 98.8, 98.4, 98.6],
    sourceName: "NSE Sectoral Indices & Performance Matrix",
    sourceUrl: "https://www.nseindia.com/market-data/live-equity-market",
    methodology:
      "Free-float market capitalization weighted price return ratio comparing NIFTY IT against the broad-market NIFTY 50 benchmark.",
    relatedSecurities: [
      { symbol: "TCS", impact: "Relative alpha: -1.2%" },
      { symbol: "INFY", impact: "Relative alpha: -1.6%" },
      { symbol: "WIPRO", impact: "Relative alpha: -1.9%" },
    ],
  },
  {
    id: "item-4",
    num: "04",
    metricKey: "earnings_results",
    headline: "TCS announced quarterly results with AI pipeline disclosures.",
    tag: "EARNINGS DISCLOSURE",
    tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    dataSummary:
      "TCS reported revenue of ₹64,259 Cr with EBIT margins at 25.8% and declared $1.2B in qualified AI enterprise deal commitments for the upcoming fiscal cycle.",
    chartData: [3900, 3920, 3915, 3960, 4010, 3995],
    sourceName: "BSE/NSE Corporate Filing & Investor Presentation",
    sourceUrl: "https://www.bseindia.com/corporates/ann.html",
    methodology:
      "Audited IFRS consolidated financial statements filed with exchanges under SEBI LODR Regulation 33.",
    relatedSecurities: [
      { symbol: "TCS", impact: "+1.2% intraday price reaction" },
      { symbol: "NIFTY IT", impact: "+0.8% sentiment anchor" },
    ],
  },
  {
    id: "item-5",
    num: "05",
    metricKey: "brent",
    headline: "Brent crude increased 4.1% over five sessions.",
    tag: "MACRO COMMODITY",
    tagColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    dataSummary:
      "Brent crude futures climbed from $69.55 to $72.40/barrel amid tighter Red Sea maritime logistics and temporary production outages in the North Sea.",
    chartData: [69.55, 70.1, 70.8, 71.4, 71.9, 72.4],
    sourceName: "ICE Futures Europe / Yahoo Finance Historical Feed",
    sourceUrl: "https://finance.yahoo.com/quote/BZ=F",
    methodology:
      "Front-month ICE Brent crude futures contract settlement prices in USD per barrel.",
    relatedSecurities: [
      { symbol: "BPCL", impact: "-1.8% OMC margin sensitivity" },
      { symbol: "ASIANPAINT", impact: "-1.4% input cost inflation" },
      { symbol: "ONGC", impact: "+2.1% upstream realization gain" },
    ],
  },
];

export function WhatChangedModule() {
  const [expandedId, setExpandedId] = useState<string | null>("item-1");

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <History className="size-3.5" />
              WHAT CHANGED?
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-600">
              Since last visit
            </span>
            <MetricInfo metric="fii_flow" customTitle="Institutional Market Delta Engine" />
          </div>
          <h3 className="text-lg font-bold text-foreground mt-0.5">
            Key Institutional Market & Macro Shifts
          </h3>
        </div>

        <Link
          href="/intelligence"
          className="group flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View Full Intelligence Journal
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="mt-5 divide-y divide-border/60">
        {ITEMS.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className="py-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : item.id);
                  }
                }}
                aria-expanded={isExpanded}
                className="flex w-full cursor-pointer items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <span className="text-sm font-bold text-muted-foreground/80 w-6 shrink-0">
                    {item.num}
                  </span>
                  <span className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.headline}
                  </span>
                  <MetricInfo metric={item.metricKey} />
                  <span
                    className={cn(
                      "hidden sm:inline-block rounded border px-2 py-0.5 text-sm font-bold tracking-wider",
                      item.tagColor,
                    )}
                  >
                    {item.tag}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {isExpanded ? "Collapse" : "Inspect Data & Chart"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expandable Module Breakdown with Provenance */}
              {isExpanded ? (
                <div className="mt-4 rounded-xl border border-border/80 bg-accent/20 p-4 space-y-4 text-sm animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm uppercase font-bold text-primary block">
                          QUANTITATIVE OBSERVATION
                        </span>
                        <MetricInfo metric={item.metricKey} />
                      </div>
                      <p className="font-sans text-sm text-foreground leading-relaxed">
                        {item.dataSummary}
                      </p>
                    </div>

                    {/* Mini SVG Trendline */}
                    <div className="md:col-span-4 rounded-lg border border-border/60 bg-card p-3 space-y-1">
                      <span className="text-sm text-muted-foreground block uppercase">
                        Trajectory
                      </span>
                      <div className="h-10 w-full flex items-end gap-1 pt-2">
                        {item.chartData.map((pt, idx) => {
                          const min = Math.min(...item.chartData);
                          const max = Math.max(...item.chartData);
                          const hPct = Math.max(15, Math.round(((pt - min) / (max - min || 1)) * 100));
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex-1 rounded-t transition-all",
                                pt >= item.chartData[0] ? "bg-emerald-500/80" : "bg-rose-500/80",
                              )}
                              style={{ height: `${hPct}%` }}
                              title={`Observation ${idx + 1}: ${pt}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Source & Methodology Row with Verified Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-sm uppercase font-bold">
                        REGULATORY SOURCE
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 mt-0.5 font-bold"
                      >
                        {item.sourceName} <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-sm uppercase font-bold">
                        METHODOLOGY
                      </span>
                      <span className="text-muted-foreground mt-0.5 block font-sans">
                        {item.methodology}
                      </span>
                    </div>
                  </div>

                  {/* Affected Securities */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-muted-foreground block text-sm uppercase font-bold mb-1.5">
                      DIRECTLY SENSITIVE SECURITIES
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.relatedSecurities.map((sec) => (
                        <div
                          key={sec.symbol}
                          className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-sm"
                        >
                          <span className="font-bold text-foreground">{sec.symbol}</span>
                          <span className="text-muted-foreground font-sans text-sm">
                            {sec.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
