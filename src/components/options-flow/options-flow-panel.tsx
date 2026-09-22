"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { DataInfo } from "@/components/feeds/data-info";
import { UniversePicker } from "@/components/options-flow/universe-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FieldSource } from "@/lib/feeds/india/types";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { cn } from "@/lib/utils";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { useState } from "react";

type SourcedField<T> = { status: "ok"; value: T; source: FieldSource } | { status: "unavailable"; reason: string };

type OptionsFlowRecord = {
  symbol: string;
  name: string;
  price: SourcedField<number>;
  priceChangePct: SourcedField<number>;
  volume: SourcedField<number>;
  volumeAvg30: SourcedField<number>;
  callsVolume: SourcedField<number>;
  putsVolume: SourcedField<number>;
  activeStrikeOiChanges: SourcedField<{ strike: number; side: "call" | "put"; oi: number; prevOi: number; change: number }[]>;
  upcomingEvent: SourcedField<string>;
};

type AnalysisOutput = {
  symbol: string;
  volumeVsRange: string;
  callPutRatioNote: string;
  openInterestNote: string;
  priceConfirmationNote: string;
  scheduledEventNote: string;
  flagged: boolean;
  uncertaintyNote: string;
  unusualnessScore: number;
};

type FlagCandidate = {
  symbol: string;
  whatIsUnusual: string;
  openInterestConfirmsOpened: boolean;
  boringExplanation: string;
  whatToFindOut: string;
  confidence: "low" | "medium" | "high";
};

type Result = {
  asOf: string;
  records: OptionsFlowRecord[];
  analysis: AnalysisOutput[];
  flagging: { candidates: FlagCandidate[]; nothingUnusualNote: string | null; researchQuestion: string | null };
  disclaimer: string;
};

const DEFAULT_MAX = 12;
const CONFIDENCE_STYLE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-rose-500/15 text-rose-400",
};

function Field({ field, fmt }: { field: SourcedField<number>; fmt?: (v: number) => string }) {
  if (field.status === "unavailable") {
    return <span className="text-muted-foreground/60" title={field.reason}>UNAVAILABLE</span>;
  }
  return (
    <span className="inline-flex items-center">
      {fmt ? fmt(field.value) : field.value}
      <DataInfo source={field.source} />
    </span>
  );
}

export function OptionsFlowPanel() {
  const [selected, setSelected] = useState<string[]>(INDIA_EQUITIES.slice(0, 6).map((i) => i.symbol));
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  function toggle(symbol: string) {
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= DEFAULT_MAX) return prev;
      return [...prev, symbol];
    });
  }

  async function run() {
    if (selected.length === 0) return;
    setLoading(true);
    setError(null);
    setSetupMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/options-flow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbols: selected }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.setupRequired) setSetupMessage(json.error);
        else setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <UniversePicker
          symbols={INDIA_EQUITIES}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => setSelected(INDIA_EQUITIES.slice(0, DEFAULT_MAX).map((i) => i.symbol))}
          onClear={() => setSelected([])}
          max={DEFAULT_MAX}
        />
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs text-muted-foreground">
            Data agent pulls price/volume and today&apos;s option chain live; the options-volume 30-day baseline builds up
            day by day via the daily cron, so early runs may show &quot;insufficient history&quot;.
          </p>
          <Button onClick={run} disabled={selected.length === 0 || loading} className="w-full">
            {loading ? "Gathering, analyzing, flagging…" : "Run screener"}
          </Button>
        </div>
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {result ? (
        <div className="space-y-6">
          <section className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Data agent — gathered, not analyzed
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Chg %</th>
                    <th className="px-3 py-2 text-right">Volume</th>
                    <th className="px-3 py-2 text-right">30d avg vol</th>
                    <th className="px-3 py-2 text-right">Calls vol</th>
                    <th className="px-3 py-2 text-right">Puts vol</th>
                    <th className="px-3 py-2 text-left">Event (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.records.map((r) => (
                    <tr key={r.symbol} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono font-medium">{r.symbol}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        <Field field={r.price} fmt={(v) => v.toFixed(2)} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <Field field={r.priceChangePct} fmt={(v) => `${v.toFixed(2)}%`} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <Field field={r.volume} fmt={(v) => v.toLocaleString("en-IN")} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <Field field={r.volumeAvg30} fmt={(v) => v.toLocaleString("en-IN", { maximumFractionDigits: 0 })} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <Field field={r.callsVolume} fmt={(v) => v.toLocaleString("en-IN")} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <Field field={r.putsVolume} fmt={(v) => v.toLocaleString("en-IN")} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground/60">
                        {r.upcomingEvent.status === "ok" ? r.upcomingEvent.value : "UNAVAILABLE"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Analysis agent — describes the gap, never bullish/bearish
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {result.analysis.map((a) => (
                <div
                  key={a.symbol}
                  className={cn(
                    "space-y-1.5 rounded-lg border p-3 text-xs",
                    a.flagged ? "border-amber-500/40 bg-amber-500/5" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold">{a.symbol}</span>
                    {a.flagged ? (
                      <Badge className="h-4 bg-amber-500/20 px-1.5 text-[9px] text-amber-400">FLAGGED</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">{a.volumeVsRange}</p>
                  <p className="text-muted-foreground">{a.callPutRatioNote}</p>
                  <p className="text-muted-foreground">{a.openInterestNote}</p>
                  <p className="text-muted-foreground">{a.priceConfirmationNote}</p>
                  {a.flagged ? <p className="text-amber-300/90">{a.uncertaintyNote}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Flagging agent — research shortlist, at most 5
            </p>
            {result.flagging.candidates.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                {result.flagging.nothingUnusualNote}
              </p>
            ) : (
              <div className="space-y-2">
                {result.flagging.candidates.map((c, i) => (
                  <div key={c.symbol} className="space-y-1.5 rounded-lg border border-border p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">
                        #{i + 1} {c.symbol}
                      </span>
                      <Badge className={cn("h-4 px-1.5 text-[9px] uppercase", CONFIDENCE_STYLE[c.confidence])}>
                        {c.confidence} confidence
                      </Badge>
                    </div>
                    <p>{c.whatIsUnusual}</p>
                    <p className="text-muted-foreground">
                      OI confirms new positions opened: <span className="font-medium">{c.openInterestConfirmsOpened ? "yes" : "no"}</span>
                    </p>
                    <p className="text-muted-foreground">Boring explanation: {c.boringExplanation}</p>
                    <p className="text-muted-foreground">To find out: {c.whatToFindOut}</p>
                  </div>
                ))}
                {result.flagging.researchQuestion ? (
                  <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                    <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
                    {result.flagging.researchQuestion}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <p className="text-[10px] leading-4 text-muted-foreground/70">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
