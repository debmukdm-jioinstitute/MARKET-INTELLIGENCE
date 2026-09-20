"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, ExternalLink, Sparkles, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CorporateEvent {
  id: string;
  time: string;
  symbol: string;
  title: string;
  category: "EARNINGS" | "DIVIDENDS" | "M&A" | "MANAGEMENT" | "REGULATORY" | "CORPORATE ACTION";
  source: string;
  url: string;
  aiSummary: string;
  portfolioExposure: string;
  inPortfolio?: boolean;
}

const EVENTS: CorporateEvent[] = [
  {
    id: "ev-1",
    time: "10:02",
    symbol: "RELIANCE",
    title: "Board Meeting to consider green energy investment & capex allocation",
    category: "MANAGEMENT",
    source: "NSE Announcements RSS",
    url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
    aiSummary:
      "Reliance board convened an extraordinary session to approve ₹12,500 Cr additional investment in gigafactory solar and hydrogen initiatives. Neutral to mildly positive for long-term ROCE.",
    portfolioExposure: "Holdings weight: 9.4% (₹1,20,696). Estimated 1D volatility impact: 0.8%.",
    inPortfolio: true,
  },
  {
    id: "ev-2",
    time: "09:47",
    symbol: "TCS",
    title: "Investor Presentation — Q4 Strategy & AI Services Deal Win Pipeline",
    category: "EARNINGS",
    source: "BSE Corporate Feed",
    url: "https://www.bseindia.com/corporates/ann.html",
    aiSummary:
      "TCS management highlighted $1.2B in generative AI deal pipeline. BFSI vertical recovery expected in H2 with steady EBIT margins at 25.8%.",
    portfolioExposure: "Holdings weight: 7.8% (₹1,00,152). Direct positive sector sentiment for IT book.",
    inPortfolio: true,
  },
  {
    id: "ev-3",
    time: "09:31",
    symbol: "HDFCBANK",
    title: "Corporate Announcement — Completion of branch expansion phase & LDR update",
    category: "CORPORATE ACTION",
    source: "NSE Announcements RSS",
    url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
    aiSummary:
      "Loan-to-Deposit ratio (LDR) reduced to 101.2%, moving towards RBI target range. Retail deposit franchise grew 16.4% YoY.",
    portfolioExposure: "Holdings weight: 11.2% (₹1,43,808). High portfolio sensitivity.",
    inPortfolio: true,
  },
  {
    id: "ev-4",
    time: "09:12",
    symbol: "INFY",
    title: "Dividend Declaration — Interim Dividend of ₹21 per equity share",
    category: "DIVIDENDS",
    source: "BSE Corporate Feed",
    url: "https://www.bseindia.com/corporates/ann.html",
    aiSummary:
      "Board approved interim dividend of ₹21/share. Record date fixed for next Friday. Dividend yield on CMP translates to ~1.3%.",
    portfolioExposure: "Holdings weight: 5.6% (₹71,904). Projected cash inflow: ₹1,176.",
    inPortfolio: true,
  },
  {
    id: "ev-5",
    time: "08:58",
    symbol: "ICICIBANK",
    title: "Financial Results — Q3 Net Profit expands 14.8% YoY with stable asset quality",
    category: "EARNINGS",
    source: "NSE Corporate Feed",
    url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
    aiSummary:
      "Net profit came in at ₹11,059 Cr vs ₹10,800 Cr expected. Gross NPA improved 6 bps to 2.15%. Net interest margin held steady at 4.36%.",
    portfolioExposure: "Watchlist item. Key benchmark for private banking sector.",
    inPortfolio: false,
  },
  {
    id: "ev-6",
    time: "08:35",
    symbol: "BHARTIARTL",
    title: "Regulatory Filing — Spectrum acquisition payment schedule clarified with DoT",
    category: "REGULATORY",
    source: "DoT / NSE Filings",
    url: "https://www.nseindia.com",
    aiSummary:
      "Prepaid ₹8,325 Cr towards high-cost deferred spectrum liabilities, saving ~₹950 Cr in annualized finance costs.",
    portfolioExposure: "Holdings weight: 4.2% (₹53,928). Mild positive for free cash flow.",
    inPortfolio: true,
  },
];

const FILTERS = [
  "ALL",
  "MY PORTFOLIO",
  "WATCHLIST",
  "EARNINGS",
  "DIVIDENDS",
  "M&A",
  "MANAGEMENT",
  "REGULATORY",
  "CORPORATE ACTION",
] as const;

export function CorporateEventsCard() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<CorporateEvent | null>(null);

  const filtered = EVENTS.filter((ev) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "MY PORTFOLIO") return ev.inPortfolio;
    if (activeFilter === "WATCHLIST") return !ev.inPortfolio;
    return ev.category === activeFilter;
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              CORPORATE EVENTS
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              (Live NSE/BSE RSS Ingestion)
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-0.5">
            Real-Time Material Filings & Disclosures
          </h3>
        </div>

        <Link
          href="/intelligence"
          className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
        >
          View All Desk
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1 overflow-x-auto scrollbar-none pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-mono font-medium transition-colors shrink-0",
              activeFilter === f
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="mt-3 divide-y divide-border/50 font-mono text-xs">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">No events found for this filter.</p>
        ) : (
          filtered.map((ev) => (
            <div
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-md hover:bg-accent/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground text-[11px] w-10 shrink-0">{ev.time}</span>
                <span className="font-bold text-foreground shrink-0 w-24 flex items-center gap-1">
                  {ev.symbol}
                  {ev.inPortfolio ? (
                    <span className="size-1.5 rounded-full bg-emerald-400" title="In your portfolio" />
                  ) : null}
                </span>
                <span className="text-muted-foreground truncate text-[11px]">{ev.title}</span>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  {ev.category}
                </span>
                <span className="text-primary text-[10px] hover:underline">Inspect →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interactive Modal / Drawer for Event Details */}
      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{selectedEvent.symbol}</span>
                  <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {selectedEvent.category}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{selectedEvent.time} IST</span>
                </div>
                <h4 className="text-base font-bold text-foreground mt-1">{selectedEvent.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="rounded-lg border border-border/70 bg-accent/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <FileText className="size-3 text-primary" />
                  SOURCE FILING & DOCUMENT
                </span>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-foreground">{selectedEvent.source}</span>
                  <a
                    href={selectedEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary text-[11px] hover:underline"
                  >
                    Open Official PDF <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  AI EXECUTIVE SUMMARY
                </span>
                <p className="text-foreground font-sans text-xs leading-relaxed">
                  {selectedEvent.aiSummary}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  PORTFOLIO IMPACT & EXPOSURE
                </span>
                <p className="text-emerald-400 font-semibold text-xs">
                  {selectedEvent.portfolioExposure}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/80"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
