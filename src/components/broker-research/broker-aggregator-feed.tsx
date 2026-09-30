"use client";

import { useMemo, useState } from "react";
import type { ApiResearchReport } from "@/lib/research/api-map";
import {
  Filter,
  Download,
  ExternalLink,
  Calendar,
  Search,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface Props {
  reports: ApiResearchReport[];
}

/**
 * Broker research aggregator feed.
 *
 * Renders ONLY real ingested research notes (research_reports table).
 * When reports is empty, shows an explicit unavailable state — never
 * invented notes.
 */
export function BrokerAggregatorFeed({ reports }: Props) {
  const [selectedBroker, setSelectedBroker] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const brokers = useMemo(() => {
    const names = new Map<string, number>();
    for (const r of reports) {
      if (r.broker) names.set(r.broker, (names.get(r.broker) ?? 0) + 1);
    }
    return ["ALL", ...Array.from(names.keys()).sort()];
  }, [reports]);

  const filtered = reports.filter((r) => {
    if (selectedBroker !== "ALL" && r.broker !== selectedBroker) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${r.title} ${r.broker ?? ""} ${r.symbol ?? ""} ${r.summary ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (reports.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl bg-card border border-border/60 space-y-3">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">No research notes available</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Broker research notes are collected from public desk publications. None have been
          ingested yet — check back later. We don&apos;t show sample or estimated notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by company, broker, or keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} of {reports.length} notes
        </span>
      </div>

      {/* Broker Filters Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" />
        {brokers.map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBroker(b)}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 ${
              selectedBroker === b
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {b === "ALL" ? "All Desks" : b}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-all shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                {r.broker ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {r.broker}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{r.source}</span>
                )}
                {r.recommendation && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                    {r.recommendation}
                  </span>
                )}
              </div>

              <div>
                {r.symbol && (
                  <Link
                    href={`/research/${encodeURIComponent(r.symbol)}`}
                    className="text-xs font-bold uppercase text-primary hover:underline"
                  >
                    {r.symbol}
                  </Link>
                )}
                <h5 className="text-xs font-semibold text-foreground/90 mt-1 leading-snug">
                  {r.title}
                </h5>
              </div>

              {(r.target_price != null || r.upside_pct != null) && (
                <div className="flex items-center gap-3 pt-1 text-xs">
                  {r.target_price != null && (
                    <div>
                      <span className="text-muted-foreground text-[11px]">Target: </span>
                      <span className="font-bold text-foreground tabular-nums">
                        ₹{r.target_price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {r.upside_pct != null && (
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {r.upside_pct >= 0 ? "+" : ""}
                      {r.upside_pct.toFixed(1)}% Upside
                    </div>
                  )}
                </div>
              )}

              {r.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {r.summary}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {r.published_at
                  ? new Date(r.published_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : `Collected ${new Date(r.scraped_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`}
              </span>

              <div className="flex items-center gap-2">
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:underline font-semibold"
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF</span>
                  </a>
                )}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-8">
          No notes match the current filters.
        </p>
      )}
    </div>
  );
}
