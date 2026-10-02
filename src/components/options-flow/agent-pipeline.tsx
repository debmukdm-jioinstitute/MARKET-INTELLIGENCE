"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, ChevronDown, Database, Flag, HelpCircle, ScanSearch } from "lucide-react";
import { useEffect, useState, Fragment } from "react";
import { FlagCard } from "./flag-card";
import type { AnalysisOutput, OptionsFlowRecord, OptionsFlowResult, SourcedField } from "./types";

function Field({ field, fmt }: { field: SourcedField<number>; fmt?: (v: number) => string }) {
  if (field.status === "unavailable") {
    return (
      <span className="text-muted-foreground/60" title={field.reason}>
        UNAVAILABLE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center">
      {fmt ? fmt(field.value) : field.value}
      <DataInfo source={field.source} />
    </span>
  );
}

function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function DataStageBody({ result }: { result: OptionsFlowResult }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Figures as of {formatAsOf(result.asOf)} IST. Every number carries its source — tap the info dot next to any
        figure to see where it came from and when.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-sm uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Chg %</th>
              <th className="px-3 py-2 text-right">Volume</th>
              <th className="px-3 py-2 text-right">30d avg vol</th>
              <th className="px-3 py-2 text-right">Calls vol</th>
              <th className="px-3 py-2 text-right">Puts vol</th>
              <th className="px-3 py-2 text-left">Earnings (30d)</th>
              <th className="px-3 py-2 text-left">Corp. action (30d)</th>
            </tr>
          </thead>
          <tbody>
            {result.records.map((r: OptionsFlowRecord) => (
              <tr key={r.symbol} className="border-t border-border/60 hover:bg-muted/50">
                <td className="px-3 py-2 font-medium">{r.symbol}</td>
                <td className="px-3 py-2 text-right">
                  <Field field={r.price} fmt={(v) => v.toFixed(2)} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Field field={r.priceChangePct} fmt={(v) => `${v.toFixed(2)}%`} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Field field={r.volume} fmt={(v) => v.toLocaleString("en-IN")} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Field field={r.volumeAvg30} fmt={(v) => v.toLocaleString("en-IN", { maximumFractionDigits: 0 })} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Field field={r.callsVolume} fmt={(v) => v.toLocaleString("en-IN")} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Field field={r.putsVolume} fmt={(v) => v.toLocaleString("en-IN")} />
                </td>
                <td
                  className="max-w-[180px] px-3 py-2 text-muted-foreground/80"
                  title={r.earningsEvent.status === "ok" ? r.earningsEvent.value : r.earningsEvent.reason}
                >
                  {r.earningsEvent.status === "ok" ? (
                    <span className="line-clamp-2">{r.earningsEvent.value}</span>
                  ) : (
                    <span className="text-muted-foreground/60">UNAVAILABLE</span>
                  )}
                </td>
                <td
                  className="max-w-[180px] px-3 py-2 text-muted-foreground/80"
                  title={r.corporateActionEvent.status === "ok" ? r.corporateActionEvent.value : r.corporateActionEvent.reason}
                >
                  {r.corporateActionEvent.status === "ok" ? (
                    <span className="line-clamp-2">{r.corporateActionEvent.value}</span>
                  ) : (
                    <span className="text-muted-foreground/60">UNAVAILABLE</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalysisStageBody({ result }: { result: OptionsFlowResult }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {result.analysis.map((a: AnalysisOutput) => (
        <div
          key={a.symbol}
          className={cn(
            "space-y-1.5 rounded-lg border p-3 text-sm",
            a.flagged ? "border-blue-600/40 bg-blue-600/[0.04]" : "border-border",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold">{a.symbol}</span>
            {a.flagged ? (
              <Badge className="h-4 bg-blue-600/20 px-1.5 text-sm text-blue-700">FLAGGED</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground">{a.volumeVsRange}</p>
          <p className="text-muted-foreground">{a.callPutRatioNote}</p>
          <p className="text-muted-foreground">{a.openInterestNote}</p>
          <p className="text-muted-foreground">{a.priceConfirmationNote}</p>
          {a.scheduledEventNote ? <p className="text-muted-foreground">{a.scheduledEventNote}</p> : null}
          {a.flagged ? <p className="text-blue-700/90">{a.uncertaintyNote}</p> : null}
        </div>
      ))}
    </div>
  );
}

function FlagsStageBody({ result }: { result: OptionsFlowResult }) {
  const bySymbol = new Map(result.records.map((r) => [r.symbol, r]));
  return (
    <div className="space-y-3">
      {result.flagging.candidates.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          <AlertTriangle className="size-3.5 shrink-0" />
          {result.flagging.nothingUnusualNote}
        </p>
      ) : (
        result.flagging.candidates.map((c, i) => (
          <FlagCard key={c.symbol} candidate={c} index={i} record={bySymbol.get(c.symbol)} />
        ))
      )}
      {result.flagging.researchQuestion ? (
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
          {result.flagging.researchQuestion}
        </p>
      ) : null}
      <p className="text-sm leading-5 text-muted-foreground/70">{result.disclaimer}</p>
    </div>
  );
}

type StageDef = {
  icon: typeof Database;
  title: string;
  plain: string;
  count: (r: OptionsFlowResult) => string;
  body: (r: OptionsFlowResult) => React.ReactNode;
};

const STAGES: StageDef[] = [
  {
    icon: Database,
    title: "Data agent",
    plain: "Gathers the figures — never judges them",
    count: (r) => `${r.records.length} tickers scanned`,
    body: (r) => <DataStageBody result={r} />,
  },
  {
    icon: ScanSearch,
    title: "Analysis agent",
    plain: "Describes the gap between options activity and price",
    count: (r) => `${r.analysis.filter((a) => a.flagged).length} gaps worth a look`,
    body: (r) => <AnalysisStageBody result={r} />,
  },
  {
    icon: Flag,
    title: "Flagging agent",
    plain: "Shortlists at most 5 tickers to research",
    count: (r) => `${r.flagging.candidates.length} of max 5 flagged`,
    body: (r) => <FlagsStageBody result={r} />,
  },
];

/**
 * The three-agent pipeline, made visible: a stepper rail (horizontal on desktop,
 * vertical on mobile) with expandable stage bodies. Stages light up one by one when
 * a run completes. Never labels anything bullish or bearish — the analysis agent
 * only describes the gap.
 */
export function AgentPipeline({ result, loading }: { result: OptionsFlowResult | null; loading: boolean }) {
  const resultKey = result?.asOf ?? null;
  const [revealed, setRevealed] = useState(0);
  const [open, setOpen] = useState<[boolean, boolean, boolean]>([false, false, false]);

  useEffect(() => {
    setRevealed(0);
    setOpen([false, false, false]);
    if (!resultKey) return;
    const timers = STAGES.map((_, i) =>
      setTimeout(() => {
        setRevealed(i + 1);
        setOpen((prev) => {
          const next: [boolean, boolean, boolean] = [...prev];
          next[i] = true;
          return next;
        });
      }, 450 * (i + 1)),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [resultKey]);

  function toggle(i: number) {
    setOpen((prev) => {
      const next: [boolean, boolean, boolean] = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="flex flex-col gap-2 md:flex-row">
          {STAGES.map((s, i) => (
            <div key={s.title} className="contents">
              {i > 0 ? <div className="mx-auto h-5 w-px bg-border md:mx-0 md:h-px md:w-auto md:flex-1 md:self-center" aria-hidden /> : null}
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-white p-3">
                <span className="flex size-9 shrink-0 animate-pulse items-center justify-center rounded-full bg-blue-600/15 text-blue-700">
                  <s.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {i + 1}. {s.title}
                  </p>
                  <p className="animate-pulse text-xs text-muted-foreground">Working…</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Gathering figures, describing the gaps, and shortlisting — usually takes under a minute.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p className="text-sm font-medium">Pick up to 20 tickers above and press “Run screener”.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You’ll watch the three agents work in order: gather the figures, describe the gaps, shortlist at most 5
          tickers to research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="flex flex-col gap-2 md:flex-row">
        {STAGES.map((s, i) => {
          const done = revealed > i;
          const isOpen = open[i];
          return (
            <Fragment key={s.title}>
              {i > 0 ? (
                <li
                  aria-hidden="true"
                  className="mx-auto h-5 w-px shrink-0 list-none bg-border md:mx-0 md:h-px md:w-auto md:flex-1 md:self-center"
                />
              ) : null}
              <li className="flex-1 list-none">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  disabled={!done}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    done
                      ? "border-border bg-white hover:border-blue-600/50"
                      : "cursor-default border-border/60 bg-muted/20 opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-blue-600/15 text-blue-700" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" /> : <s.icon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">
                      {i + 1}. {s.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{s.plain}</span>
                    {done ? (
                      <span className="block text-xs font-medium text-blue-700">{s.count(result)}</span>
                    ) : null}
                  </span>
                  {done ? (
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  ) : null}
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>

      {STAGES.map((s, i) =>
        revealed > i && open[i] ? (
          <section key={s.title} aria-label={`${s.title} details`} className="rounded-xl border border-border bg-white p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Stage {i + 1} · {s.title} — {s.plain}
            </h3>
            {s.body(result)}
          </section>
        ) : null,
      )}
    </div>
  );
}
