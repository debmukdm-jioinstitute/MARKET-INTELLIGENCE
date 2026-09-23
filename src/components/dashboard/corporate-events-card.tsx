"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, ExternalLink, Sparkles, X, FileText, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { MetricInfo } from "@/components/ui/metric-info";

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

const FILTERS = [
  "ALL",
  "MY PORTFOLIO",
  "REGULATORY",
  "CORPORATE ACTION",
  "EARNINGS",
  "DIVIDENDS",
] as const;

export function CorporateEventsCard() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<CorporateEvent | null>(null);

  // Ingest live RSS items from official exchange feeds
  const { data: hubData, loading } = useFeedHub(45_000);
  const liveNews = hubData?.news ?? [];

  // Map real RSS items into structured events
  const realEvents: CorporateEvent[] = liveNews.map((n, idx) => {
    const isRbi = n.source === "rbi";
    const isSec = n.source === "sec";
    const symbol = isRbi ? "RBI" : isSec ? "SEC" : n.source.toUpperCase();
    const cat = isRbi
      ? "REGULATORY"
      : n.title.toLowerCase().includes("dividend")
      ? "DIVIDENDS"
      : n.title.toLowerCase().includes("result") || n.title.toLowerCase().includes("financial")
      ? "EARNINGS"
      : "CORPORATE ACTION";

    const pubDate = n.publishedAt ? new Date(n.publishedAt) : new Date();
    const timeStr = `${String(pubDate.getHours()).padStart(2, "0")}:${String(pubDate.getMinutes()).padStart(2, "0")}`;

    return {
      id: n.id ?? `event-${idx}`,
      time: timeStr,
      symbol,
      title: n.title,
      category: cat as any,
      source: isRbi
        ? "Reserve Bank of India (Official Press Releases RSS)"
        : isSec
        ? "SEC EDGAR Official Feed"
        : `${n.source.toUpperCase()} Regulatory Announcements`,
      url: n.link,
      aiSummary: `Official regulatory notification: "${n.title}". Ingested directly from exchange regulatory feed. Disclosed to ensure orderly market information symmetry under statutory guidelines.`,
      portfolioExposure: "Regulatory disclosure impact: Market sentiment & systematic macro channel.",
      inPortfolio: isRbi || symbol === "RELIANCE" || symbol === "TCS" || symbol === "HDFCBANK",
    };
  });

  const displayEvents = realEvents.length > 0 ? realEvents : [];

  const filtered = displayEvents.filter((ev) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "MY PORTFOLIO") return ev.inPortfolio;
    return ev.category === activeFilter;
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              CORPORATE DISCLOSURES & EVENTS
            </span>
            <MetricInfo metric="corporate_announcement" customTitle="Material Corporate Events & Filings" />
            <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
              <Radio className="size-3 animate-pulse" />
              Live RSS Feed
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-0.5">
            Real-Time Material Filings (RBI, NSE & BSE RSS)
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
        {loading && displayEvents.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            Ingesting live announcements from RBI and exchange RSS streams…
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            No events found for this filter in current live RSS stream.
          </p>
        ) : (
          filtered.slice(0, 7).map((ev, idx) => (
            <div
              key={`${ev.id}-${idx}`}
              onClick={() => setSelectedEvent(ev)}
              className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-md hover:bg-accent/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground text-[11px] w-12 shrink-0">{ev.time}</span>
                <span className="font-bold text-foreground shrink-0 w-24 flex items-center gap-1">
                  {ev.symbol}
                  {ev.inPortfolio ? (
                    <span className="size-1.5 rounded-full bg-emerald-600" title="Relevant to portfolio" />
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

      {/* Modal / Drawer for Event Details */}
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
                  <span className="font-mono text-xs text-muted-foreground">{selectedEvent.time}</span>
                  <MetricInfo metric="corporate_announcement" />
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
                  OFFICIAL FILING ENDPOINT
                </span>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-foreground">{selectedEvent.source}</span>
                  <a
                    href={selectedEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary text-[11px] font-bold hover:underline"
                  >
                    Open Regulatory Document <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  SYNTHESIS
                </span>
                <p className="text-foreground font-sans text-xs leading-relaxed">
                  {selectedEvent.aiSummary}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  PORTFOLIO EXPOSURE
                </span>
                <p className="text-emerald-600 font-semibold text-xs">
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
