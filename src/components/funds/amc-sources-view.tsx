"use client";

import { AMC_DISCLOSURE_SOURCES } from "@/lib/funds/amfi-crawler";
import {
  Database,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";

export function AmcSourcesView() {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Database className="w-3.5 h-3.5" />
              <span>Official Regulatory & Ingestion Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              AMFI & AMC Disclosure Registry
            </h1>
            <p className="text-sm text-muted-foreground">
              Direct access to SEBI-mandated monthly portfolio disclosures, AMC factsheets, scheme documents (SID/KIM), and the live AMFI daily NAV feed.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <RefreshCw className="w-4 h-4" />
            <span>Live AMFI NAVs refresh automatically (15-min cache)</span>
          </div>
        </div>

        {/* Regulatory Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Monthly Disclosure Schedule</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              10th of Every Calendar Month
            </div>
            <div className="text-[11px] text-muted-foreground">
              SEBI circular mandate for all equity and hybrid schemes.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>AMFI Daily NAV Feed</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              End-of-Day Publication (9:00 PM IST)
            </div>
            <div className="text-[11px] text-muted-foreground">
              Daily NAVs parsed across all registered mutual fund schemes.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Half-Yearly Portfolios</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              March 31 & September 30
            </div>
            <div className="text-[11px] text-muted-foreground">
              Comprehensive complete disclosure of all underlying assets.
            </div>
          </div>
        </div>
      </div>

      {/* AMC Registry Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Official AMC Portals & Disclosure Endpoints</h2>
          <span className="text-xs text-muted-foreground">{AMC_DISCLOSURE_SOURCES.length} Fund Houses Tracked</span>
        </div>

        <div className="divide-y divide-border/40">
          {AMC_DISCLOSURE_SOURCES.map((amc) => (
            <div key={amc.amcId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
              <div className="space-y-1">
                <div className="font-semibold text-sm text-foreground">{amc.amcName}</div>
                <div className="text-xs text-muted-foreground">AMC Portal: {amc.websiteUrl}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={amc.portfolioDisclosureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Monthly Portfolios</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>

                <a
                  href={amc.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/40 text-foreground transition-colors"
                >
                  <span>AMC Portal</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
