"use client";

import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FinancialsPayload } from "@/lib/financials/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  TrendingUp,
  Zap,
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

const fmtCr = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
};

const fmtRatio = (n: number | null | undefined, unit = ""): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}${unit}`;
};

const fmtDays = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${Math.round(n)}d`;
};

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
          <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs font-semibold">
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
          <p className="text-xs mt-1 text-muted-foreground">{error}</p>
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 pb-2.5 no-scrollbar">
            {[
              { id: "forensic", label: "Executive Forensic Health", icon: ShieldCheck },
              { id: "quarterly_perf", label: "Quarterly Performance", icon: TrendingUp },
              { id: "pl", label: "Profit & Loss", icon: FileText },
              { id: "bs", label: "Balance Sheet", icon: FileSpreadsheet },
              { id: "cf", label: "Cash Flow", icon: Activity },
              { id: "ratios", label: "Working Capital & Ratios", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
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
          {activeTab === "forensic" && (
            <div className="space-y-6">
              {/* Scorecard banner */}
              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Institutional Solvency & Health Rating
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-semibold",
                          data.forensicAnalysis.rating === "Strong"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : data.forensicAnalysis.rating === "Adequate"
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {data.forensicAnalysis.rating}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                        {data.forensicAnalysis.healthScore}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">/ 100 Health Score</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:border-l sm:border-border/60 sm:pl-6">
                    <div>
                      <p className="font-medium text-foreground">Working Capital</p>
                      <p className="mt-0.5">{data.forensicAnalysis.workingCapitalSummary}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Earnings Quality</p>
                      <p className="mt-0.5">{data.forensicAnalysis.cashFlowQuality} Cash Backing</p>
                    </div>
                  </div>
                </div>

                {/* AI Executive Synthesis */}
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-foreground">
                  <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-primary">
                    <Zap className="size-3.5" />
                    <span>AI Forensic & Solvency Synthesis ({data.forensicAnalysis.aiModelUsed})</span>
                  </div>
                  <p className="text-muted-foreground">{data.forensicAnalysis.executiveSummary}</p>
                </div>
              </div>

              {/* Signals Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {data.forensicAnalysis.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 transition-all text-xs",
                      flag.type === "strength"
                        ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                        : flag.type === "warning"
                        ? "border-amber-500/30 bg-amber-500/5 text-foreground"
                        : "border-border bg-card text-foreground",
                    )}
                  >
                    {flag.type === "strength" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{flag.title}</span>
                        {flag.metricValue ? (
                          <Badge variant="outline" className="text-[10px] tabular-nums font-semibold">
                            {flag.metricValue}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{flag.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: QUARTERLY PERFORMANCE ANALYSIS */}
          {activeTab === "quarterly_perf" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.quarters.slice(-4).map((q, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1] : null;
                  const revRow = data.pl.quarters.find((r) => r.tag === "RevenueFromOperations" || r.tag === "Income");
                  const patRow = data.pl.quarters.find((r) => r.tag === "ProfitLossForPeriod");
                  const curRev = revRow?.values[q.key] ?? null;
                  const prevRev = prev ? revRow?.values[prev.key] ?? null : null;
                  const revChg = curRev !== null && prevRev !== null && prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : null;

                  const curPat = patRow?.values[q.key] ?? null;
                  const prevPat = prev ? patRow?.values[prev.key] ?? null : null;
                  const patChg = curPat !== null && prevPat !== null && prevPat > 0 ? ((curPat - prevPat) / prevPat) * 100 : null;

                  const ratios = data.ratios.quarters.find((r) => r.periodKey === q.key);

                  return (
                    <div key={q.key} className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{q.label}</span>
                        <Badge variant="outline" className="text-[10px]">{q.audited ? "Audited" : "Reviewed"}</Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-semibold tabular-nums">₹{fmtCr(curRev)} Cr</span>
                          {revChg !== null ? (
                            <span className={cn("ml-1.5 font-medium tabular-nums", revChg >= 0 ? "text-emerald-600" : "text-rose-600")}>
                              {revChg >= 0 ? "+" : ""}{revChg.toFixed(1)}% QoQ
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <span className="text-muted-foreground">Net Profit: </span>
                          <span className="font-semibold tabular-nums">₹{fmtCr(curPat)} Cr</span>
                          {patChg !== null ? (
                            <span className={cn("ml-1.5 font-medium tabular-nums", patChg >= 0 ? "text-emerald-600" : "text-rose-600")}>
                              {patChg >= 0 ? "+" : ""}{patChg.toFixed(1)}% QoQ
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <span className="text-muted-foreground">Operating Margin: </span>
                          <span className="font-semibold tabular-nums">{fmtRatio(ratios?.opmPct, "%")}</span>
                        </div>
                      </div>

                      {q.xbrlUrl ? (
                        <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Filing XBRL:</span>
                          <a href={q.xbrlUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                            <span>XML</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Sequential Analysis Commentary */}
              <div className="rounded-xl border border-border p-4 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-1">Quarterly Growth Velocity:</p>
                <p>
                  Figures represent sequential quarter-on-quarter and annual performance extracted from standalone and consolidated regulatory disclosures submitted to the National Stock Exchange of India.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3, 4, 5: STATEMENT TABLES (P&L, BS, CF) */}
          {(activeTab === "pl" || activeTab === "bs" || activeTab === "cf") && (
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-foreground">
                    <th className="py-2.5 pl-4 pr-3 min-w-[220px]">
                      {activeTab === "pl" ? "Income Statement Item" : activeTab === "bs" ? "Balance Sheet Item" : "Cash Flow Activity"}
                      <span className="ml-1 text-[10px] text-muted-foreground font-normal">(₹ in Cr)</span>
                    </th>
                    {cols.map((col) => (
                      <th key={col.key} className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                        <div>{col.label}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {col.audited ? "Audited" : "Reviewed"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-normal">
                  {(activeTab === "pl" ? plRows : activeTab === "bs" ? bsRows : cfRows).map((row) => {
                    const isTotal = row.kind === "total";
                    return (
                      <tr
                        key={row.tag}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isTotal && "bg-muted/20 font-semibold text-foreground",
                        )}
                      >
                        <td className={cn("py-2 pl-4 pr-3", isTotal ? "font-semibold text-foreground" : "text-muted-foreground")}>
                          {row.label}
                        </td>
                        {cols.map((col) => {
                          const val = row.values[col.key];
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "py-2 px-3 text-right tabular-nums whitespace-nowrap",
                                isTotal && "font-semibold text-foreground",
                                val !== null && val < 0 && "text-rose-600 dark:text-rose-400",
                              )}
                            >
                              {row.unit === "ps" ? (val !== null ? `₹${val.toFixed(2)}` : "—") : fmtCr(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: WORKING CAPITAL & FINANCIAL RATIOS */}
          {activeTab === "ratios" && (
            <div className="space-y-6">
              {/* Working capital cards */}
              <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground">Working Capital Efficiency & Operating Cycle</h4>
                    <p className="text-xs text-muted-foreground">
                      Days Sales Outstanding (DSO), Inventory Days (DIO), Payable Days (DPO), and Net Cash Conversion Cycle (CCC).
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold">Regulatory Standard</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-semibold text-foreground">
                        <th className="py-2 pl-3 pr-2">Metric</th>
                        {wcList.map((w) => (
                          <th key={w.periodKey} className="py-2 px-3 text-right">{w.periodLabel}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-normal">
                      <tr>
                        <td className="py-2 pl-3 font-medium text-foreground">Days Sales Outstanding (DSO)</td>
                        {wcList.map((w) => (
                          <td key={w.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtDays(w.dso)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 pl-3 font-medium text-foreground">Inventory Days (DIO)</td>
                        {wcList.map((w) => (
                          <td key={w.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtDays(w.dio)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 pl-3 font-medium text-foreground">Payable Days (DPO)</td>
                        {wcList.map((w) => (
                          <td key={w.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtDays(w.dpo)}</td>
                        ))}
                      </tr>
                      <tr className="bg-primary/5 font-semibold text-primary">
                        <td className="py-2 pl-3">Cash Conversion Cycle (CCC = DSO + DIO - DPO)</td>
                        {wcList.map((w) => (
                          <td key={w.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtDays(w.ccc)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ratios Table */}
              <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-foreground">
                      <th className="py-2 pl-4 pr-3">Key Financial Ratio</th>
                      {ratioList.map((r) => (
                        <th key={r.periodKey} className="py-2 px-3 text-right">{r.periodLabel}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-normal">
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Operating Profit Margin (OPM %)</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.opmPct, "%")}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Net Profit Margin (NPM %)</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.npmPct, "%")}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Return on Equity (ROE %)</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.roePct, "%")}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Return on Capital Employed (ROCE %)</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.rocePct, "%")}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Debt to Equity Ratio</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.debtToEquity, "x")}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Current Ratio</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.currentRatio, "x")}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 font-medium text-foreground">Interest Coverage Ratio</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.interestCoverage, "x")}</td>
                      ))}
                    </tr>
                    <tr className="bg-muted/15 font-semibold text-foreground">
                      <td className="py-2 pl-4">Operating Cash Flow / Net Profit (CFO / PAT)</td>
                      {ratioList.map((r) => (
                        <td key={r.periodKey} className="py-2 px-3 text-right tabular-nums">{fmtRatio(r.cfoToNetProfit, "x")}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Verification & Regulatory Source Links */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Official Regulatory Provenance & Source Citations</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.officialSources.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-primary hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
                  >
                    <span>Verify at {s.provider.includes("NSE") ? "NSE" : "Source"}</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
