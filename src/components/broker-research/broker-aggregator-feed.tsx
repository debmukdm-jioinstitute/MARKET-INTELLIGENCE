"use client";

import { useState } from "react";
import { BrokerResearchReport, InstitutionalBroker, ResearchRating } from "@/lib/broker-research/types";
import {
  Filter,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  TrendingUp,
  FileText,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Props {
  reports: BrokerResearchReport[];
}

export function BrokerAggregatorFeed({ reports }: Props) {
  const [selectedBroker, setSelectedBroker] = useState<string>("ALL");
  const [selectedRating, setSelectedRating] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const brokers: { id: string; label: string }[] = [
    { id: "ALL", label: "All Desks" },
    { id: "Motilal Oswal", label: "Motilal Oswal" },
    { id: "ICICI Securities", label: "ICICI Sec" },
    { id: "Kotak Securities", label: "Kotak" },
    { id: "HDFC Securities", label: "HDFC Sec" },
    { id: "Axis Securities", label: "Axis" },
    { id: "Emkay Global", label: "Emkay" },
    { id: "JM Financial", label: "JM Financial" },
    { id: "Nuvama", label: "Nuvama" },
    { id: "Prabhudas Lilladher", label: "PL India" },
    { id: "Yes Securities", label: "Yes Sec" },
    { id: "IIFL Securities", label: "IIFL" },
  ];

  const ratings = ["ALL", "BUY", "ACCUMULATE", "HOLD", "SELL"];

  const filtered = reports.filter((r) => {
    if (selectedBroker !== "ALL" && r.broker !== selectedBroker) return false;
    if (selectedRating !== "ALL" && r.rating !== selectedRating) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSym = r.symbol.toLowerCase().includes(q);
      const matchComp = r.companyName.toLowerCase().includes(q);
      const matchThesis = r.thesis.toLowerCase().includes(q);
      const matchAnalyst = r.analyst.toLowerCase().includes(q);
      if (!matchSym && !matchComp && !matchThesis && !matchAnalyst) return false;
    }
    return true;
  });

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
            placeholder="Search report by company, analyst, or thesis..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Rating Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Rating:</span>
          {ratings.map((rt) => (
            <button
              key={rt}
              onClick={() => setSelectedRating(rt)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                selectedRating === rt
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      {/* Broker Filters Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" />
        {brokers.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBroker(b.id)}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 ${
              selectedBroker === b.id
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {b.label}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {r.broker}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Analyst: {r.analyst}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    r.rating === "BUY"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : r.rating === "ACCUMULATE"
                      ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {r.rating}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/research/${encodeURIComponent(r.symbol)}`}
                    className="text-xs font-bold uppercase text-primary hover:underline"
                  >
                    {r.symbol}
                  </Link>
                  <span className="text-xs font-semibold text-foreground">
                    {r.companyName}
                  </span>
                </div>

                <h5 className="text-xs font-semibold text-foreground/90 mt-1 leading-snug">
                  {r.reportTitle}
                </h5>
              </div>

              {/* Targets strip */}
              <div className="flex items-center gap-3 pt-1 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px]">Target: </span>
                  <span className="font-bold text-foreground tabular-nums">
                    ₹{r.targetPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">CMP: </span>
                  <span className="font-medium text-foreground tabular-nums">
                    ₹{r.cmp.toLocaleString()}
                  </span>
                </div>
                <div className="font-semibold text-emerald-400 tabular-nums">
                  +{r.upsidePct}% Upside
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {r.thesis}
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {r.displayDate}
              </span>

              <div className="flex items-center gap-2">
                {r.reportPdfUrl ? (
                  <a
                    href={r.reportPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:underline font-semibold"
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF Note</span>
                  </a>
                ) : (
                  <a
                    href={r.sourcePortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <span>Desk Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
