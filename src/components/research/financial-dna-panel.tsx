"use client";

import { Panel } from "@/components/layout/page-header";
import { Fold } from "@/components/guide/explain";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { DnaCategory, FinancialDNA } from "@/lib/research/financial-dna";

type Band = "strong" | "healthy" | "mixed" | "weak" | "poor";

const BAND_COPY: Record<Band, { label: string; chip: string }> = {
  strong: { label: "Strong", chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" },
  healthy: { label: "Healthy", chip: "border-teal-500/25 bg-teal-500/10 text-teal-800 dark:text-teal-200" },
  mixed: { label: "Mixed", chip: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200" },
  weak: { label: "Weak", chip: "border-orange-500/25 bg-orange-500/10 text-orange-800 dark:text-orange-200" },
  poor: { label: "Poor", chip: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200" },
};

const BAND_FILL: Record<Band, string> = {
  strong: "bg-emerald-500",
  healthy: "bg-teal-500",
  mixed: "bg-amber-500",
  weak: "bg-orange-500",
  poor: "bg-rose-500",
};

/** Spec 2H score labels. Conservative wording only, never buy/sell language. */
function bandFor(score: number): Band {
  if (score >= 85) return "strong";
  if (score >= 70) return "healthy";
  if (score >= 55) return "mixed";
  if (score >= 40) return "weak";
  return "poor";
}

function weightLabel(weight: number): string {
  const pct = weight <= 1 ? weight * 100 : weight;
  return `${Math.round(pct)}%`;
}

function ScoreHero({ score }: { score: number | null }) {
  if (score === null || !Number.isFinite(score)) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-5">
        <p className="text-base font-semibold text-foreground">Insufficient data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Not enough reported history to compute an overall score yet.
        </p>
      </div>
    );
  }
  const band = bandFor(score);
  const copy = BAND_COPY[band];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-muted/40 p-5">
      <p className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
        {Math.round(score)}
        <span className="text-2xl font-semibold text-muted-foreground">/100</span>
      </p>
      <div className="min-w-0">
        <span
          className={cn(
            "inline-block rounded-full border px-3 py-1 text-sm font-semibold",
            copy.chip,
          )}
        >
          {copy.label}
        </span>
        <p className="mt-1.5 max-w-md text-sm leading-snug text-muted-foreground">
          Weighted across the five categories below. Missing categories are excluded, never scored as zero.
        </p>
      </div>
    </div>
  );
}

function CategoryRow({ category }: { category: DnaCategory }) {
  const score = category.score;
  const scorable = score !== null && Number.isFinite(score);
  const band = scorable ? bandFor(score as number) : null;

  const hasDetail = category.reasons.length > 0 || category.metrics.length > 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex w-full items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-foreground">{category.label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Weight {weightLabel(category.weight)}</span>
        </span>
        {scorable ? (
          <span className="flex shrink-0 items-center gap-2.5">
            <span
              className="h-2 w-20 overflow-hidden rounded-full bg-muted sm:w-28"
              role="img"
              aria-label={`${category.label} score ${Math.round(score as number)} out of 100`}
            >
              <span
                className={cn("block h-full rounded-full", BAND_FILL[band as Band])}
                style={{ width: `${Math.min(100, Math.max(0, score as number))}%` }}
              />
            </span>
            <span className="w-14 text-right text-base font-bold tabular-nums text-foreground">
              {Math.round(score as number)}
              <span className="text-xs font-medium text-muted-foreground">/100</span>
            </span>
          </span>
        ) : (
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Insufficient data</span>
        )}
      </div>
      {hasDetail ? (
        <div className="mt-2">
          <Fold title="Why this score">
            {category.reasons.length > 0 && (
              <div>
                <ul className="space-y-1.5">
                  {category.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {category.metrics.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground">Underlying metrics</p>
                <dl className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {category.metrics.map((m, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 px-3 py-2">
                      <dt className="text-sm text-muted-foreground">{m.label}</dt>
                      <dd className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Fold>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No detail available for this category right now.
        </p>
      )}
    </div>
  );
}

export function FinancialDnaPanel({ dna }: { dna: FinancialDNA | null }) {
  return (
    <Panel
      id="mi-financial-dna"
      title="MI Financial DNA"
      subtitle="A deterministic, rules-based read of reported financial strength, broken into five scored categories."
    >
      {dna === null ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          MI Financial DNA is unavailable for this company.
        </p>
      ) : (
        <div className="space-y-3">
          <ScoreHero score={dna.score} />
          <div className="space-y-2.5">
            {dna.categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </div>
          <div className="pt-1">
            <p className="text-xs leading-relaxed text-muted-foreground">
              A rules-based snapshot of reported financial strength. It is not an investment recommendation.
            </p>
            {dna.asOf ? (
              <p className="mt-0.5 text-xs text-muted-foreground">Financials as of {dna.asOf}.</p>
            ) : null}
          </div>
        </div>
      )}
    </Panel>
  );
}

export function FinancialDnaSkeleton() {
  return (
    <Panel
      id="mi-financial-dna"
      title="MI Financial DNA"
      subtitle="A deterministic, rules-based read of reported financial strength, broken into five scored categories."
    >
      <div className="space-y-3" aria-hidden>
        <div className="flex items-center gap-6 rounded-xl border border-border bg-muted/40 p-5">
          <div className="h-14 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-20 animate-pulse rounded-full bg-muted sm:w-28" />
                  <div className="h-5 w-14 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
      </div>
    </Panel>
  );
}
