"use client";

import { AiOutputNote } from "@/components/ui/ai-output-note";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowLeftRight,
  ChevronDown,
  Landmark,
  Newspaper,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef } from "react";

export type AnalystNote = {
  role: string;
  view: "bullish" | "neutral" | "bearish";
  keyPoints: string[];
  confidence: number;
  dataNote?: string;
};
export type DebateNote = { role: string; thesis: string; keyPoints: string[] };
export type TraderDecision = { action: "BUY" | "HOLD" | "SELL"; sizeSuggestionPct: number; rationale: string; confidence: number };
export type RiskVerdict = {
  approved: boolean;
  finalAction: "BUY" | "HOLD" | "SELL";
  maxPositionPct: number;
  stopLossPct: number;
  rationale: string;
};
export type TradingDeskResult = {
  symbol: string;
  name: string;
  market: "IN" | "US";
  price: number | null;
  changePct: number | null;
  headlineCount: number;
  analysts: AnalystNote[];
  debate: DebateNote[];
  trader: TraderDecision;
  risk: RiskVerdict;
  disclaimer: string;
};

function viewColor(view: "bullish" | "neutral" | "bearish") {
  return view === "bullish" ? "text-emerald-600" : view === "bearish" ? "text-rose-600" : "text-stone-500";
}
function actionColor(action: "BUY" | "HOLD" | "SELL") {
  return action === "BUY" ? "text-emerald-600" : action === "SELL" ? "text-rose-600" : "text-blue-600";
}

const PERSONA: Record<string, { icon: typeof Activity; bg: string; fg: string }> = {
  "Fundamental Analyst": { icon: Landmark, bg: "bg-teal-100", fg: "text-teal-700" },
  "Sentiment Analyst": { icon: Newspaper, bg: "bg-amber-100", fg: "text-amber-700" },
  "Technical Analyst": { icon: Activity, bg: "bg-blue-100", fg: "text-blue-700" },
  "Bull Researcher": { icon: TrendingUp, bg: "bg-emerald-100", fg: "text-emerald-700" },
  "Bear Researcher": { icon: TrendingDown, bg: "bg-rose-100", fg: "text-rose-700" },
  Trader: { icon: ArrowLeftRight, bg: "bg-violet-100", fg: "text-violet-700" },
  "Risk Manager": { icon: ShieldCheck, bg: "bg-stone-200", fg: "text-stone-700" },
};

function PersonaAvatar({ role, size = "md" }: { role: string; size?: "md" | "lg" }) {
  const p = PERSONA[role] ?? PERSONA["Technical Analyst"];
  const Icon = p.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        p.bg,
        p.fg,
        size === "lg" ? "size-11" : "size-9",
      )}
      aria-hidden
    >
      <Icon className={size === "lg" ? "size-5" : "size-4"} />
    </span>
  );
}

function RoundShell({
  id,
  index,
  label,
  blurb,
  children,
}: {
  id: string;
  index: number;
  label: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={label} className="ai-desk-rise scroll-mt-32" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">
          {index + 1}
        </span>
        <div>
          <h3 className="text-base font-bold text-stone-900">{label}</h3>
          <p className="text-sm text-stone-500">{blurb}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ExpandableEvidence({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group mt-3 rounded-lg bg-stone-50 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-stone-700 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="size-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

export function DebateArena({ result, onWatched }: { result: TradingDeskResult; onWatched: () => void }) {
  const watchedRef = useRef(false);
  const verdictRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = verdictRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !watchedRef.current) {
          watchedRef.current = true;
          onWatched();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onWatched]);

  const bullCount = result.analysts.filter((a) => a.view === "bullish").length;
  const bearCount = result.analysts.filter((a) => a.view === "bearish").length;
  const neutralCount = result.analysts.length - bullCount - bearCount;
  const total = Math.max(1, result.analysts.length);
  const majority =
    bullCount >= bearCount && bullCount >= neutralCount
      ? `${bullCount} of ${result.analysts.length} analysts lean bullish`
      : bearCount >= neutralCount
        ? `${bearCount} of ${result.analysts.length} analysts lean bearish`
        : `${neutralCount} of ${result.analysts.length} analysts are neutral`;

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes aiDeskRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .ai-desk-rise { animation: aiDeskRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes aiDeskToastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .ai-desk-toast { animation: aiDeskToastIn 0.3s ease-out both; }
      `}</style>

      {/* Round quick-nav */}
      <nav aria-label="Debate rounds" className="ai-desk-rise flex flex-wrap gap-2">
        {[
          ["debate-evidence", "1 · Evidence"],
          ["debate-clash", "2 · The debate"],
          ["debate-decision", "3 · The decision"],
          ["debate-verdict", "4 · Final call"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={`#${href}`}
            className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-600 shadow-sm transition hover:border-teal-500 hover:text-teal-700"
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Symbol hero */}
      <div className="ai-desk-rise rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" style={{ animationDelay: "40ms" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-stone-900">
              {result.name} <span className="font-normal text-stone-400">({result.symbol})</span>
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {result.market === "IN" ? "NSE" : "US market"} · price at run time{" "}
              <span className="font-semibold text-stone-800">
                {result.price != null ? result.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "n/a"}
              </span>
              {result.changePct != null ? (
                <span className={cn("ml-1 font-semibold", result.changePct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  ({result.changePct >= 0 ? "+" : ""}
                  {(result.changePct * 100).toFixed(2)}% on the day)
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-xl bg-teal-50 px-4 py-2 text-right">
            <p className="text-2xl font-bold text-teal-700">{result.headlineCount}</p>
            <p className="text-xs text-teal-700/70">news stories read</p>
          </div>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-500">
          What this means: five AI agents read the same real data — price, fundamentals, charts and these headlines —
          then argued it out below. Agreement is interesting; it is not a prediction.
        </p>
      </div>

      {/* Round 1 — analysts */}
      <RoundShell
        id="debate-evidence"
        index={0}
        label="The evidence"
        blurb="Three analysts read the real data first — each gives a view and says how sure it is."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {result.analysts.map((a) => (
            <div key={a.role} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <PersonaAvatar role={a.role} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-stone-900">{a.role}</p>
                  <Badge variant="outline" className={cn("mt-0.5 h-5 px-2 text-xs uppercase", viewColor(a.view))}>
                    {a.view}
                  </Badge>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm leading-5 text-stone-600">
                {a.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-stone-300" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-stone-500">
                Confidence <span className="font-semibold text-stone-700">{(a.confidence * 100).toFixed(0)}%</span>
              </p>
              <p className="text-xs text-stone-400">What this means: the model&apos;s own guess at how sure it is — not a measured probability.</p>
              {a.dataNote ? (
                <ExpandableEvidence summary="See the data behind this view">
                  <p className="text-sm leading-5 text-stone-600">{a.dataNote}</p>
                </ExpandableEvidence>
              ) : null}
            </div>
          ))}
        </div>
      </RoundShell>

      {/* Round 2 — bull vs bear */}
      <RoundShell
        id="debate-clash"
        index={1}
        label="The debate"
        blurb="Bull and bear researchers take the analysts' notes and argue the opposite sides."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {result.debate.map((d) => {
            const isBull = d.role.toLowerCase().includes("bull");
            return (
              <div
                key={d.role}
                className={cn(
                  "rounded-2xl border-2 p-4 shadow-sm",
                  isBull ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <PersonaAvatar role={d.role} />
                  <p className="text-sm font-bold text-stone-900">{d.role}</p>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-stone-800">“{d.thesis}”</p>
                <ExpandableEvidence summary="Read the supporting points">
                  <ul className="space-y-1.5 text-sm leading-5 text-stone-600">
                    {d.keyPoints.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-stone-300" aria-hidden />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </ExpandableEvidence>
              </div>
            );
          })}
        </div>
      </RoundShell>

      {/* Round 3 — trader */}
      <RoundShell
        id="debate-decision"
        index={2}
        label="The decision"
        blurb="The trader hears both sides and picks an illustrative stance."
      >
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <PersonaAvatar role="Trader" size="lg" />
            <div>
              <p className="text-sm font-bold text-stone-900">Trader</p>
              <p className="text-sm">
                <span className={cn("text-lg font-bold", actionColor(result.trader.action))}>{result.trader.action}</span>
                <span className="ml-2 text-stone-500">
                  illustrative size {result.trader.sizeSuggestionPct.toFixed(1)}% · confidence{" "}
                  {(result.trader.confidence * 100).toFixed(0)}%
                </span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-600">{result.trader.rationale}</p>
          <p className="mt-2 text-xs text-stone-400">
            What this means: an example position size for research — not a recommendation to trade.
          </p>
        </div>
      </RoundShell>

      {/* Round 4 — risk manager + decision snapshot */}
      <RoundShell
        id="debate-verdict"
        index={3}
        label="The final call"
        blurb="The risk manager can approve or overrule the trader — safety first."
      >
        <div ref={verdictRef} className="rounded-2xl border-2 border-teal-600/30 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <PersonaAvatar role="Risk Manager" size="lg" />
              <p className="text-sm font-bold text-stone-900">Risk manager</p>
            </div>
            <Badge
              variant={result.risk.approved ? "default" : "destructive"}
              className="h-6 px-3 text-xs uppercase"
            >
              {result.risk.approved ? "Approved" : "Overruled"}
            </Badge>
          </div>
          <p className="mt-3 text-sm">
            <span className={cn("text-lg font-bold", actionColor(result.risk.finalAction))}>
              {result.risk.finalAction}
            </span>
            <span className="ml-2 text-stone-500">
              max position {result.risk.maxPositionPct.toFixed(1)}% · stop-loss {result.risk.stopLossPct.toFixed(1)}%
            </span>
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{result.risk.rationale}</p>
          <p className="mt-2 text-xs text-stone-400">
            What this means: guardrails on how big the position could be and where losses get cut — the desk&apos;s
            safety rules, not advice.
          </p>

          {/* Verdict meter */}
          <div className="mt-5 rounded-xl bg-stone-50 p-4">
            <p className="text-sm font-bold text-stone-900">Analyst agreement meter</p>
            <div
              className="mt-2 flex h-3 overflow-hidden rounded-full bg-stone-200"
              role="img"
              aria-label={`Analyst views: ${bullCount} bullish, ${neutralCount} neutral, ${bearCount} bearish`}
            >
              <div className="bg-emerald-500" style={{ width: `${(bullCount / total) * 100}%` }} />
              <div className="bg-stone-400" style={{ width: `${(neutralCount / total) * 100}%` }} />
              <div className="bg-rose-500" style={{ width: `${(bearCount / total) * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
              <span><span className="font-semibold text-emerald-600">{bullCount}</span> bullish</span>
              <span><span className="font-semibold text-stone-500">{neutralCount}</span> neutral</span>
              <span><span className="font-semibold text-rose-600">{bearCount}</span> bearish</span>
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {majority}. Disagreement is normal — it shows where the evidence is genuinely unclear.
            </p>
          </div>
        </div>
      </RoundShell>

      <AiOutputNote
        evidenceAsOf={`${result.headlineCount} news headlines and ${result.market === "IN" ? "NSE" : "US"} price at time of run`}
        disagreement={
          new Set(result.analysts.map((a) => a.view)).size > 1
            ? result.analysts.map((a) => `${a.role}: ${a.view}`).join("; ")
            : null
        }
      />
      <p className="text-sm text-stone-400">{result.disclaimer}</p>
    </div>
  );
}
