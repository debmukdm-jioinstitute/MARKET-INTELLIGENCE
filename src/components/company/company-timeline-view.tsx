"use client";

import { useState } from "react";
import { CompanyTimelineEvent, TimelineEventType } from "@/lib/company-intelligence/types";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Presentation,
  ShieldAlert,
  MessageSquare,
  Building2,
  Factory,
  Headphones,
  Leaf,
  BookOpen,
  DollarSign,
  ExternalLink,
  Filter,
} from "lucide-react";

interface Props {
  events: CompanyTimelineEvent[];
  companyName: string;
  symbol: string;
}

export function CompanyTimelineView({ events, companyName, symbol }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filterOptions = [
    { id: "ALL", label: "All Disclosures" },
    { id: "REGULATORY_FILING", label: "Regulatory" },
    { id: "INVESTOR_PRESENTATION", label: "Presentations" },
    { id: "CREDIT_RATING", label: "Credit Ratings" },
    { id: "MANAGEMENT_COMMENTARY", label: "Commentary" },
    { id: "ACQUISITION_MNA", label: "M&A / Deals" },
    { id: "PRODUCTION_UPDATE", label: "Production" },
  ];

  const filtered = activeFilter === "ALL"
    ? events
    : events.filter((e) => e.type === activeFilter);

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case "REGULATORY_FILING":
        return <FileText className="w-4 h-4 text-sky-400" />;
      case "INVESTOR_PRESENTATION":
        return <Presentation className="w-4 h-4 text-indigo-400" />;
      case "CREDIT_RATING":
        return <ShieldAlert className="w-4 h-4 text-emerald-400" />;
      case "MANAGEMENT_COMMENTARY":
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case "ACQUISITION_MNA":
        return <Building2 className="w-4 h-4 text-purple-400" />;
      case "PRODUCTION_UPDATE":
        return <Factory className="w-4 h-4 text-cyan-400" />;
      case "EARNINGS_CONCALL":
        return <Headphones className="w-4 h-4 text-blue-400" />;
      case "ESG_DISCLOSURE":
        return <Leaf className="w-4 h-4 text-emerald-400" />;
      case "ANNUAL_REPORT":
        return <BookOpen className="w-4 h-4 text-orange-400" />;
      case "DIVIDEND_CAPITAL":
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "HIGH_IMPACT":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            High Impact
          </span>
        );
      case "STRATEGIC":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Strategic
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
            Routine
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div>
          <h3 className="text-base font-medium text-foreground tracking-tight flex items-center gap-2">
            <span>Corporate Disclosure & Filing Stream</span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
              {filtered.length} events
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continuous chronology crawled from NSE, BSE, SEBI disclosures, and {companyName} Investor Relations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                activeFilter === opt.id
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/60 before:via-border before:to-transparent">
        {filtered.map((item) => (
          <div key={item.id} className="relative group">
            {/* Timeline Dot & Icon */}
            <div className="absolute -left-6 sm:-left-8 top-1 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-card border-2 border-primary/50 shadow-sm group-hover:border-primary group-hover:scale-110 transition-all">
              {getEventIcon(item.type)}
            </div>

            {/* Event Card */}
            <div className="p-4 rounded-xl bg-card/60 hover:bg-card border border-border/60 hover:border-primary/30 transition-all shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary tabular-nums tracking-wide">
                    {item.displayDate}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground">
                    {item.date}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  {getImpactBadge(item.impact)}
                </div>

                {item.sourceDocLabel && (
                  <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                    {item.sourceDocLabel}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                {item.headline}
              </h4>

              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {item.summary}
              </p>

              {/* Extracted Key Metrics */}
              {item.keyMetrics && item.keyMetrics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  {item.keyMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-xs bg-muted/30 px-2.5 py-1 rounded-md border border-border/30"
                    >
                      <span className="text-muted-foreground">{m.label}:</span>
                      <span
                        className={`font-medium tabular-nums ${
                          m.sentiment === "POSITIVE"
                            ? "text-emerald-400"
                            : m.sentiment === "NEGATIVE"
                            ? "text-rose-400"
                            : "text-foreground"
                        }`}
                      >
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {item.sourceUrl && (
                <div className="mt-3 flex justify-end">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors"
                  >
                    <span>View Official Filing Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
