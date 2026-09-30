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
              <span>SEBI Master Circular 2024</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              100% Holdings Transparency
            </div>
            <div className="text-[11px] text-muted-foreground">
              ISIN-level disclosures, sector classifications, and cash weights.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Live Ingestion Endpoint</span>
            </div>
            <div className="text-sm font-bold text-foreground truncate" title="https://www.amfiindia.com/spages/NAVAll.txt">
              amfiindia.com/spages/NAVAll.txt
            </div>
            <div className="text-[11px] text-muted-foreground">
              Daily NAVs parsed across all registered mutual fund schemes.
            </div>
          </div>
        </div>
      </div>

      {/* AMC Portals Directory Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Official Asset Management Company (AMC) Disclosure Portals
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified statutory disclosure links for monthly portfolio Excel files, factsheets, and regulatory SID/KIM filings
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {AMC_DISCLOSURE_SOURCES.length} AMCs Indexed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="px-4 py-3">Fund House (AMC)</th>
                <th className="px-4 py-3">Monthly Portfolio Disclosures</th>
                <th className="px-4 py-3">Fund Factsheets</th>
                <th className="px-4 py-3">Scheme Documents (SID / KIM)</th>
                <th className="px-4 py-3">Formats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {AMC_DISCLOSURE_SOURCES.map((amc) => (
                <tr key={amc.amcId} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <a
                        href={amc.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{amc.amcName}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {amc.monthlyDisclosureSchedule}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <a
                      href={amc.portfolioDisclosureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium px-2.5 py-1 rounded bg-primary/10 border border-primary/20 transition-colors"
                    >
                      <span>Portfolio Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>

                  <td className="px-4 py-3.5">
                    <a
                      href={amc.factsheetsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-primary font-medium px-2.5 py-1 rounded bg-muted border border-border/50 transition-colors"
                    >
                      <span>Monthly Factsheet</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  </td>

                  <td className="px-4 py-3.5">
                    <a
                      href={amc.schemeDocumentsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-primary font-medium px-2.5 py-1 rounded bg-muted border border-border/50 transition-colors"
                    >
                      <span>SID / KIM Filings</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {amc.supportedFormats.map((fmt) => (
                        <span
                          key={fmt}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40 font-medium"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
