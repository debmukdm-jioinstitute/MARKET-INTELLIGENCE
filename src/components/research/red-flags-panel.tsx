"use client";

import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { Panel } from "@/components/layout/page-header";
import { Fold } from "@/components/guide/explain";
import { cn } from "@/lib/utils";
import type { RedFlagResult } from "@/lib/research/red-flags";

/** One item from the RedFlagResult.flags array. Derived via indexing so this
 *  component stays aligned with the types workstream's exact shape. */
type Flag = RedFlagResult["flags"][number];

type Severity = Flag["severity"];

const SEVERITY_ORDER: Record<Severity, number> = {
  high: 0,
  warning: 1,
  watch: 2,
  info: 3,
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  warning: "Warning",
  watch: "Watch",
  info: "Info",
};

/** Restrained severity treatment: deep amber for high, fading to muted for info.
 *  Deliberately no red gradients or alarming colours. */
const SEVERITY_PILL: Record<Severity, string> = {
  high: "border-amber-800/40 bg-amber-900/10 text-amber-900",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  watch: "border-amber-300/40 bg-amber-300/10 text-amber-700",
  info: "border-border bg-muted text-muted-foreground",
};

const PANEL_TITLE = "Red Flag Engine";
const DISCLAIMER =
  "Flags indicate areas worth further investigation. They do not automatically imply misconduct or a bad investment.";

function severityOf(flag: Flag): Severity {
  return flag.severity ?? "info";
}

function FlagCard({ flag }: { flag: Flag }) {
  const severity = severityOf(flag);
  const evidence = flag.evidence ?? [];
  const periods = flag.sourcePeriods ?? [];
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            SEVERITY_PILL[severity] ?? SEVERITY_PILL.info,
          )}
        >
          {SEVERITY_LABEL[severity] ?? "Info"}
        </span>
      </div>
      <h4 className="mt-2 text-base font-semibold leading-snug text-foreground">{flag.title}</h4>
      {flag.summary ? (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{flag.summary}</p>
      ) : null}
      {evidence.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {evidence.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
            >
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">{String(item.value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {periods.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Based on: {periods.join(", ")}</p>
      ) : null}
      {flag.methodology ? (
        <div className="mt-3">
          <Fold title="Methodology">
            <p className="text-sm leading-relaxed text-muted-foreground">{flag.methodology}</p>
          </Fold>
        </div>
      ) : null}
    </article>
  );
}

function PositivesList({ positives }: { positives: string[] }) {
  return (
    <section aria-label="What looks healthy" className="rounded-xl border border-border bg-card p-4">
      <h4 className="text-base font-semibold text-foreground">What looks healthy</h4>
      <ul className="mt-2 space-y-2">
        {positives.map((text, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Red Flag Engine presentation: deterministic financial-pattern flags from the
 * engine, sorted by severity, with evidence, source periods and methodology.
 * Purely presentational: no data fetching, no inline async.
 */
export function RedFlagsPanel({ result }: { result: RedFlagResult | null }) {
  const flags = useMemo(() => {
    if (!result?.flags) return [];
    return [...result.flags].sort(
      (a, b) => (SEVERITY_ORDER[severityOf(a)] ?? 3) - (SEVERITY_ORDER[severityOf(b)] ?? 3),
    );
  }, [result]);
  const positives = useMemo(() => result?.positives ?? [], [result]);

  if (!result) {
    return (
      <Panel title={PANEL_TITLE} subtitle={DISCLAIMER} collapsible={false}>
        <p className="text-sm text-muted-foreground">Red flag analysis is unavailable for this company.</p>
      </Panel>
    );
  }

  const hasContent = flags.length > 0 || positives.length > 0;

  return (
    <Panel title={PANEL_TITLE} subtitle={DISCLAIMER}>
      {!hasContent ? (
        <p className="text-sm text-muted-foreground">
          No major flags detected from available reported data.
        </p>
      ) : (
        <div className="space-y-3">
          {flags.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="Red flags">
              {flags.map((flag) => (
                <FlagCard key={flag.id ?? flag.title} flag={flag} />
              ))}
            </div>
          ) : null}
          {positives.length > 0 ? <PositivesList positives={positives} /> : null}
        </div>
      )}
    </Panel>
  );
}

/** Loading placeholder: pulsing cards that mirror the panel layout. */
export function RedFlagsSkeleton() {
  return (
    <Panel title={PANEL_TITLE} subtitle={DISCLAIMER} collapsible={false}>
      <div className="space-y-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="mt-3 h-5 w-2/3 rounded bg-muted" />
            <div className="mt-2 h-4 w-full rounded bg-muted" />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="h-10 rounded-lg bg-muted" />
              <div className="h-10 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading red flag analysis</span>
    </Panel>
  );
}
