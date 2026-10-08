"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExecutiveForensicAnalysis } from "@/lib/financials/types";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

type Rating = ExecutiveForensicAnalysis["rating"];
type Flag = ExecutiveForensicAnalysis["flags"][number];

const VERDICT: Record<Rating, { line: string; tone: string; ring: string }> = {
  Strong: { line: "Financially healthy. It earns cash, owes little and pays its bills comfortably.", tone: "text-emerald-700 bg-emerald-500/15", ring: "stroke-emerald-500" },
  Adequate: { line: "Generally fine, with a few things worth watching.", tone: "text-sky-700 bg-sky-500/15", ring: "stroke-sky-500" },
  Cautionary: { line: "Several warning signs. Look closely before relying on this company.", tone: "text-amber-700 bg-amber-500/15", ring: "stroke-amber-500" },
  Distressed: { line: "Serious financial stress. Treat with extra care.", tone: "text-rose-700 bg-rose-500/15", ring: "stroke-rose-500" },
};

type Kind = "debt" | "cash-cycle" | "margin" | "cash-backing" | "other";

/** What each tile means in plain words. Keyed off the unit of the metric the analysis produced. */
const KIND_COPY: Record<Kind, { label: string; meaning: string }> = {
  debt: { label: "Debt vs own money", meaning: "For every ₹1 the owners put in, how much is borrowed. Lower is safer." },
  "cash-cycle": { label: "Cash conversion cycle", meaning: "Days between paying for stock and getting paid by customers. A negative number means suppliers fund the business — no cash is locked up." },
  margin: { label: "Profit on each ₹100 of sales", meaning: "EBITDA: what the company keeps before interest, tax and depreciation." },
  "cash-backing": { label: "Profit backed by real cash", meaning: "Above 100% means reported profit turned into actual cash, not just paper." },
  other: { label: "Key figure", meaning: "" },
};

function kindOf(flag: Flag): Kind {
  // L4: stable metricId from the service; the old suffix-regex heuristics stay
  // only as a fallback for flags built without one.
  if (flag.metricId && flag.metricId !== "other") return flag.metricId;
  const v = flag.metricValue ?? "";
  const t = `${flag.title} ${flag.detail}`.toLowerCase();
  if (/x$/i.test(v) || /leverage|debt|equity/.test(t)) return "debt";
  if (/day/i.test(v) || /conversion cycle|working capital/.test(t)) return "cash-cycle";
  if (/%$/.test(v) && /cash|earnings quality|cfo|operating cash/.test(t)) return "cash-backing";
  if (/%$/.test(v)) return "margin";
  return "other";
}

const GLOSSARY: [string, string][] = [
  ["DSO (days sales outstanding)", "How many days customers take to pay you after a sale."],
  ["DIO (days inventory outstanding)", "How many days stock sits in the warehouse before it is sold."],
  ["DPO (days payables outstanding)", "How many days the company takes to pay its own suppliers."],
  ["Cash conversion cycle", "DSO + DIO − DPO. The days cash stays tied up. Shorter is better."],
  ["Debt to equity (D/E)", "Borrowed money divided by the owners' money. Under 1x is usually comfortable."],
  ["EBITDA margin", "Profit before interest, tax and depreciation as a share of sales (PBDIT convention)."],
  ["Earnings quality", "Whether profit is backed by cash coming in. Cash profit above 100% is a good sign."],
];

function Ring({ score, ring }: { score: number; ring: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`Health score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={ring} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums leading-none">{score}</span>
        <span className="mt-1 text-sm text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

/** Beginner-first view of the solvency analysis: verdict, four labelled numbers, everything else folded away. */
export function ForensicHealth({ analysis, companyName }: { analysis: ExecutiveForensicAnalysis; companyName?: string }) {
  // M4: never render a manufactured verdict. When the filings yielded no
  // statements, say so plainly instead of showing a 75/100 "Adequate".
  if (analysis.insufficientData) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Financial health check</p>
        <p className="mt-2 text-lg leading-snug text-foreground">
          Not enough filed financial statements are available{companyName ? ` for ${companyName}` : ""} to run the
          automated health check.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We only score companies from their actual exchange filings — nothing is estimated. The official annual
          reports below are the authoritative record.
        </p>
      </div>
    );
  }
  const v = VERDICT[analysis.rating];
  // One tile per kind (first flag wins), always in the same order so pages look alike.
  const order: Kind[] = ["debt", "cash-cycle", "margin", "cash-backing"];
  const byKind = new Map<Kind, Flag>();
  for (const f of analysis.flags) {
    const k = kindOf(f);
    if (k !== "other" && !byKind.has(k)) byKind.set(k, f);
  }
  const tiles = order.map((k) => ({ k, flag: byKind.get(k) })).filter((t): t is { k: Kind; flag: Flag } => !!t.flag);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Ring score={analysis.healthScore} ring={v.ring} />
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Financial health check</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={cn("rounded-full px-3 py-1 text-base font-semibold", v.tone)}>{analysis.rating}</span>
            </div>
            <p className="max-w-xl text-lg leading-snug text-foreground">{v.line}</p>
          </div>
        </div>
      </div>

      {tiles.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map(({ k, flag }) => {
            const good = flag.type === "strength";
            return (
              <div key={k} className={cn("rounded-xl border p-4", good ? "border-emerald-500/30 bg-emerald-500/5" : flag.type === "warning" ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card")}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">{KIND_COPY[k].label}</p>
                  {good ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Good sign" /> : <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-label="Watch this" />}
                </div>
                <p className="mt-1 text-3xl font-bold tabular-nums">{flag.metricValue}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{KIND_COPY[k].meaning}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold">
          Why this rating
          <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-border px-4 py-4">
          <ul className="space-y-3">
            {analysis.flags.map((f, i) => (
              <li key={i} className="flex gap-3">
                {f.type === "strength" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}
                <div>
                  <p className="text-base font-medium">
                    {f.title}
                    {f.metricValue ? <Badge variant="outline" className="ml-2 align-middle text-sm tabular-nums">{f.metricValue}</Badge> : null}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.executiveSummary}</p>
          <p className="text-sm text-muted-foreground">Worked out automatically from the company's filed financial statements. Descriptive only, not advice.</p>
        </div>
      </details>

      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold">
          New to this? Terms in plain English
          <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <dl className="grid gap-x-6 gap-y-3 border-t border-border px-4 py-4 sm:grid-cols-2">
          {GLOSSARY.map(([term, def]) => (
            <div key={term}>
              <dt className="text-base font-medium">{term}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{def}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
