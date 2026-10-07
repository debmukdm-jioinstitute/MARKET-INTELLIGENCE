"use client";

import { Panel } from "@/components/layout/page-header";
import { fmtInr } from "@/lib/format-india";
import type { BrokerCallSummary, RatingBucket } from "@/lib/research/broker-calls";
import { cn } from "@/lib/utils";
import { useState } from "react";
import useSWR from "swr";

type BrokerCallsResponse = BrokerCallSummary & {
  symbol: string;
  windowDays: number;
  dbConfigured: boolean;
  asOf?: string;
  source: { label: string; url: string };
};

/** Module-level fetcher — an inline async fn here would be a new identity every render (React #185). */
async function loadBrokerCalls(url: string): Promise<BrokerCallsResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as BrokerCallsResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const BUCKET_LABEL: Record<RatingBucket, string> = { strong_buy: "Strong Buy", buy: "Buy", hold: "Hold", reduce: "Reduce", sell: "Sell" };
const BUCKET_TONE: Record<RatingBucket, string> = {
  strong_buy: "bg-emerald-100 text-emerald-800",
  buy: "bg-emerald-50 text-emerald-700",
  hold: "bg-amber-50 text-amber-800",
  reduce: "bg-rose-50 text-rose-700",
  sell: "bg-rose-100 text-rose-800",
};

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function verdictText(d: BrokerCallsResponse): string {
  const buy = d.distribution.strong_buy + d.distribution.buy;
  const sell = d.distribution.reduce + d.distribution.sell;
  const parts = [buy ? `${buy} Buy` : "", d.distribution.hold ? `${d.distribution.hold} Hold` : "", sell ? `${sell} Sell` : ""].filter(Boolean);
  const head = `${d.count} broker call${d.count === 1 ? "" : "s"} in ${d.windowDays} days: ${parts.join(" · ")}.`;
  if (d.targetMedian === null) return head;
  const range = d.targetMin !== d.targetMax ? ` (range ${fmtInr(d.targetMin)}–${fmtInr(d.targetMax)})` : "";
  return `${head} Median target ${fmtInr(d.targetMedian)}${range}.`;
}

function TargetRangeBar({ d }: { d: BrokerCallsResponse }) {
  const { targetMin: lo, targetMax: hi, targetMedian: med, cmp } = d;
  if (lo === null || hi === null || med === null) return null;
  const domainLo = Math.min(lo, cmp ?? lo);
  const domainHi = Math.max(hi, cmp ?? hi);
  const span = domainHi - domainLo || 1;
  const at = (v: number) => `${(((v - domainLo) / span) * 100).toFixed(2)}%`;
  return (
    <div className="space-y-1.5" aria-label="Broker target price range">
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary/25" style={{ left: at(lo), width: lo === hi ? "6px" : `calc(${at(hi)} - ${at(lo)})` }} />
        <div className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-primary" style={{ left: at(med) }} title={`Median target ${fmtInr(med)}`} />
        {cmp !== null ? <div className="absolute top-0 h-8 w-0.5 bg-foreground/70" style={{ left: at(cmp) }} title={`Current price ${fmtInr(cmp)}`} /> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Lowest {fmtInr(lo)}</span>
        <span>
          <span className="font-semibold text-primary">| Median {fmtInr(med)}</span>
          {cmp !== null ? <span className="ml-3 font-semibold text-foreground">| Price now {fmtInr(cmp)}</span> : null}
        </span>
        <span>Highest {fmtInr(hi)}</span>
      </div>
    </div>
  );
}

export function BrokerCallsPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<BrokerCallsResponse>(`/api/research/broker-calls?symbol=${encodeURIComponent(symbol)}`, loadBrokerCalls, {
    revalidateOnFocus: false,
  });
  const [open, setOpen] = useState(false);

  return (
    <Panel
      title="Broker calls"
      subtitle="Recent public broker calls we collected — not a full market consensus (that's paid data)."
      trust={{ source: "Moneycontrol (public broker recommendations)", asOf: data?.asOf ?? null, note: "Research and education only — not investment advice" }}
    >
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading broker calls for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load broker calls right now. Try again in a moment.</p> : null}
      {data && !error && data.count === 0 ? (
        <p className="text-sm text-muted-foreground">
          No broker calls collected for {symbol} in the last {data.windowDays} days.
          {data.dbConfigured ? "" : " (Database not configured on this deployment.)"}
        </p>
      ) : null}
      {data && !error && data.count > 0 ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{verdictText(data)}</p>
            {data.medianImpliedUpsidePct !== null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Median target is {data.medianImpliedUpsidePct >= 0 ? "above" : "below"} the current price by {Math.abs(data.medianImpliedUpsidePct).toFixed(1)}% (a broker view, not a forecast).
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Object.keys(BUCKET_LABEL) as RatingBucket[])
                .filter((b) => data.distribution[b] > 0)
                .map((b) => (
                  <span key={b} className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium", BUCKET_TONE[b])}>
                    {BUCKET_LABEL[b]} · {data.distribution[b]}
                  </span>
                ))}
            </div>
          </div>

          <TargetRangeBar d={data} />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {open ? "Hide" : "Show"} per-broker table ({data.count})
          </button>

          {open ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="text-sm text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Broker</th>
                    <th className="py-2 pr-3 font-medium">Rating</th>
                    <th className="py-2 pr-3 text-right font-medium">Target</th>
                    <th className="py-2 pr-3 text-right font-medium">vs price</th>
                    <th className="py-2 pr-3 font-medium">Report date</th>
                    <th className="py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.calls.map((c) => (
                    <tr key={c.sourceUrl} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium text-foreground">{c.broker}</td>
                      <td className="py-2 pr-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-sm font-medium", BUCKET_TONE[c.bucket])}>{c.action}</span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c.targetPrice ? fmtInr(c.targetPrice) : "—"}</td>
                      <td className={cn("py-2 pr-3 text-right tabular-nums", c.impliedUpsidePct === null ? "text-muted-foreground" : c.impliedUpsidePct >= 0 ? "text-emerald-700" : "text-rose-700")}>
                        {c.impliedUpsidePct === null ? "—" : `${c.impliedUpsidePct >= 0 ? "+" : ""}${c.impliedUpsidePct.toFixed(1)}%`}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{fmtDay(c.reportDate)}</td>
                      <td className="py-2">
                        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          Article ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Source:{" "}
            <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {data.source.label} ↗
            </a>
            . Ratings are the brokers&apos; own words; we only group them into Buy / Hold / Sell.
          </p>
        </div>
      ) : null}
    </Panel>
  );
}
