"use client";

import { Panel } from "@/components/layout/page-header";
import { Fold } from "@/components/guide/explain";
import { ForensicHealth } from "@/components/research/forensic-health";
import { QuarterlyView, RatiosView, StatementView } from "@/components/research/financial-views";
import { cn } from "@/lib/utils";
import type { FinancialsPayload } from "@/lib/financials/types";
import {
  Activity,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

export type FinancialsResponse = FinancialsPayload;

async function loadFinancials(url: string): Promise<FinancialsResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as FinancialsResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export function FinancialsPanel({ symbol }: { symbol: string }) {
  const key = `/api/research/financials?symbol=${encodeURIComponent(symbol)}`;
  const { data, error, isLoading } = useSWR<FinancialsResponse>(key, loadFinancials, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const [periodType, setPeriodType] = useState<"quarter" | "annual">("quarter");
  const [activeTab, setActiveTab] = useState<"forensic" | "quarterly_perf" | "pl" | "bs" | "cf" | "ratios">("forensic");

  const cols = useMemo(() => {
    if (!data) return [];
    return periodType === "quarter" ? data.quarters : data.annuals;
  }, [data, periodType]);

  const plRows = useMemo(() => {
    if (!data) return [];
    return periodType === "quarter" ? data.pl.quarters : data.pl.annuals;
  }, [data, periodType]);

  const bsRows = useMemo(() => {
    if (!data) return [];
    return periodType === "quarter" ? data.bs.quarters : data.bs.annuals;
  }, [data, periodType]);

  const cfRows = useMemo(() => {
    if (!data) return [];
    return periodType === "quarter" ? data.cf.quarters : data.cf.annuals;
  }, [data, periodType]);

  const wcList = useMemo(() => {
    if (!data) return [];
    return periodType === "quarter" ? data.workingCapital.quarters : data.workingCapital.annuals;
  }, [data, periodType]);

  const ratioList = useMemo(() => {
    if (!data) return [];
    return periodType === "quarter" ? data.ratios.quarters : data.ratios.annuals;
  }, [data, periodType]);

  return (
    <Panel
      id="financial-statements"
      title="Financial Statements & Fundamental Analysis"
      subtitle="Audited and reviewed financial statements submitted under Regulation 33 of SEBI LODR, parsed directly from official NSE XBRL filings."
      trust={{
        source: "NSE Official XBRL Results Filings",
        note: "Data extracted from statutory exchange disclosures. No interpolation or synthetic figures.",
      }}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-0.5 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setPeriodType("quarter")}
              className={cn(
                "rounded-md px-3 py-1 transition-all cursor-pointer",
                periodType === "quarter"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Quarterly
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("annual")}
              className={cn(
                "rounded-md px-3 py-1 transition-all cursor-pointer",
                periodType === "annual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Annual (FY)
            </button>
          </div>
        </div>
      }
    >
      {isLoading && !data ? (
        <div className="space-y-4 py-8 text-center">
          <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Fetching official XBRL results from NSE India…</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200/50 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
          <p className="font-medium">Could not load financial statements</p>
          <p className="text-sm mt-1 text-muted-foreground">{error}</p>
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 pb-2.5 no-scrollbar">
            {[
              { id: "forensic", label: "Health check", icon: ShieldCheck },
              { id: "quarterly_perf", label: "Latest quarter", icon: TrendingUp },
              { id: "pl", label: "Profit and loss", icon: FileText },
              { id: "bs", label: "Balance Sheet", icon: FileSpreadsheet },
              { id: "cf", label: "Cash Flow", icon: Activity },
              { id: "ratios", label: "Ratios", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary border border-primary/25 shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent",
                  )}
                >
                  <Icon className={cn("size-3.5", active ? "text-primary" : "text-muted-foreground")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: EXECUTIVE FORENSIC HEALTH */}
          {activeTab === "forensic" && <ForensicHealth analysis={data.forensicAnalysis} companyName={data.companyName} />}

          {activeTab === "quarterly_perf" && <QuarterlyView quarters={data.quarters} plRows={data.pl.quarters} ratios={data.ratios.quarters} />}
          {activeTab === "pl" && <StatementView kind="pl" rows={plRows} cols={cols} />}
          {activeTab === "bs" && <StatementView kind="bs" rows={bsRows} cols={cols} />}
          {activeTab === "cf" && <StatementView kind="cf" rows={cfRows} cols={cols} />}
          {activeTab === "ratios" && <RatiosView wc={wcList} ratios={ratioList} cols={cols} annualized={periodType === "quarter"} />}

          {/* Official Verification & Regulatory Source Links */}
          <Fold title="Where these numbers come from (official filings)">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="grid gap-2 sm:grid-cols-2">
              {data.officialSources.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-primary hover:underline inline-flex items-center gap-1 text-xs font-medium"
                  >
                    <span>Verify at {s.provider.includes("NSE") ? "NSE" : "Source"}</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
          </Fold>
        </div>
      ) : null}
    </Panel>
  );
}
