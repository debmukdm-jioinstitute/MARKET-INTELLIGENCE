"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { TickerPicker, type InstrumentSearchResult } from "@/components/ai-desk/ticker-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiAnalysisQuota } from "@/hooks/use-ai-analysis-quota";
import { aiRunErrorMessage } from "@/lib/ai/run-response";
import { cn } from "@/lib/utils";
import { ChevronDown, FlaskConical, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type AlphaFactorResult = {
  name: string;
  formula: string;
  category: string;
  rationale: string;
  status: "ok" | "na";
  note?: string;
  informationCoefficient: number | null;
  backtestSharpe: number | null;
  sampleSize: number;
};

type Result = {
  symbols: { symbol: string; name: string; points: number }[];
  factors: AlphaFactorResult[];
  disclaimer: string;
};

const MAX_TICKERS = 8;

function FactorCard({ factor }: { factor: AlphaFactorResult }) {
  const ic = factor.informationCoefficient;
  const sharpe = factor.backtestSharpe;
  return (
    <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-stone-900">{factor.name}</p>
            <Badge variant="outline" className="h-5 px-2 text-xs uppercase text-stone-500">
              {factor.category}
            </Badge>
            {factor.status === "na" ? (
              <Badge variant="outline" className="h-5 px-2 text-xs uppercase text-amber-600">
                not enough data
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm text-stone-500">{factor.formula}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-right">
          <div>
            <p className="text-xs text-stone-400">Signal strength</p>
            <p
              className={cn(
                "text-base font-bold tabular-nums",
                ic == null ? "text-stone-300" : ic > 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {ic != null ? ic.toFixed(3) : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Backtest Sharpe</p>
            <p className="text-base font-bold tabular-nums text-stone-800">
              {sharpe != null ? sharpe.toFixed(2) : "N/A"}
            </p>
          </div>
          <ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-stone-100 px-4 py-4">
        <p className="text-sm font-medium text-stone-700">Why the AI suggested it</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">{factor.rationale}</p>
        {factor.note ? <p className="mt-2 text-sm text-blue-600">{factor.note}</p> : null}
        <div className="mt-3 grid gap-3 rounded-xl bg-stone-50 p-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-stone-800">
              Signal strength (IC): {ic != null ? ic.toFixed(3) : "N/A"}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-stone-500">
              What this means: did the factor&apos;s signal line up with future returns? Above 0 means it helped,
              below 0 means it hurt. Tiny numbers are normal — markets are noisy.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              Backtest Sharpe: {sharpe != null ? sharpe.toFixed(2) : "N/A"}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-stone-500">
              What this means: return per unit of risk in the backtest. Above 1 is decent, above 2 is strong. Past
              results never guarantee future ones.
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-400">Tested on {factor.sampleSize} data points of real price history.</p>
      </div>
    </details>
  );
}

export function AlphaDiscoveryPanel() {
  const { blocked, refreshQuota } = useAiAnalysisQuota();
  const [picked, setPicked] = useState<InstrumentSearchResult[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  function add(hit: InstrumentSearchResult) {
    if (picked.length >= MAX_TICKERS) return;
    if (picked.some((p) => p.symbol === hit.symbol)) return;
    setPicked([...picked, hit]);
  }
  function remove(symbol: string) {
    setPicked(picked.filter((p) => p.symbol !== symbol));
  }

  async function run() {
    if (picked.length === 0) return;
    setLoading(true);
    setError(null);
    setSetupMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/alpha-discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbols: picked.map((p) => p.symbol) }),
      });
      const json = await res.json();
      if (!res.ok) {
        const parsed = aiRunErrorMessage(json);
        if (parsed.setupMessage) setSetupMessage(parsed.setupMessage);
        else setError(parsed.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json as Result);
      void refreshQuota();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600">
            <FlaskConical className="size-6 text-white" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Factor lab — test ideas from the AI</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Pick 1–8 stocks as a test universe. The AI proposes investing ideas (“factors”) from a fixed, safe list —
              then this app backtests each one on real historical prices. No AI-generated code is ever executed.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <TickerPicker onPick={add} placeholder="Search and add up to 8 tickers…" />
            <p className="mt-1 text-xs text-stone-400">
              What this means: the universe is the set of stocks every idea gets tested on.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex min-h-10 flex-wrap items-center gap-1.5">
              {picked.map((p) => (
                <span
                  key={p.symbol}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 py-1 pl-3 pr-2 text-sm font-medium text-stone-700"
                >
                  {p.symbol}
                  <button
                    type="button"
                    onClick={() => remove(p.symbol)}
                    aria-label={`Remove ${p.symbol}`}
                    className="rounded-full p-0.5 hover:bg-stone-200"
                  >
                    <X className="size-3.5 text-stone-400" />
                  </button>
                </span>
              ))}
              {picked.length === 0 ? <p className="text-sm text-stone-400">No tickers selected yet.</p> : null}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={run} disabled={picked.length === 0 || loading || blocked} size="lg" className="flex-1">
                {loading ? "Proposing & backtesting…" : blocked ? "Upgrade to run" : "Discover factors"}
              </Button>
              <span className="shrink-0 text-sm text-stone-400">{picked.length}/{MAX_TICKERS}</span>
            </div>
            {blocked ? (
              <p className="text-sm text-stone-500">
                Free monthly limit used.{" "}
                <Link href="/pricing" className="font-semibold text-teal-700 hover:underline">
                  Upgrade
                </Link>{" "}
                for unlimited runs.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-violet-600" />
            </span>
            <p className="text-sm font-medium text-stone-700">
              The AI is proposing ideas; each one is being backtested on real prices…
            </p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">
            Test universe: {result.symbols.map((s) => `${s.symbol} (${s.points} days of prices)`).join(", ")}
          </p>
          {result.factors.length === 0 ? (
            <p className="text-sm text-stone-500">No factors came back for this universe — try different tickers.</p>
          ) : (
            result.factors.map((f, i) => <FactorCard key={`${f.name}-${i}`} factor={f} />)
          )}
          <p className="text-sm text-stone-400">{result.disclaimer}</p>
        </div>
      ) : null}

      {!result && !loading ? (
        <p className="text-center text-sm text-stone-400">
          No factors yet — add tickers above and press “Discover factors”.
        </p>
      ) : null}
    </div>
  );
}
