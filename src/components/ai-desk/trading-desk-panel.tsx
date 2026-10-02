"use client";

import { DebateArena, type TradingDeskResult } from "@/components/ai-desk/debate-arena";
import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { TickerPicker, type InstrumentSearchResult } from "@/components/ai-desk/ticker-picker";
import { Button } from "@/components/ui/button";
import { useAiAnalysisQuota } from "@/hooks/use-ai-analysis-quota";
import { aiRunErrorMessage } from "@/lib/ai/run-response";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

const TRY_TICKERS: { symbol: string; name: string; market: "IN" | "US" }[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", market: "IN" },
  { symbol: "HDFCBANK", name: "HDFC Bank", market: "IN" },
  { symbol: "TCS", name: "Tata Consultancy Services", market: "IN" },
  { symbol: "INFY", name: "Infosys", market: "IN" },
  { symbol: "AAPL", name: "Apple Inc.", market: "US" },
  { symbol: "NVDA", name: "NVIDIA Corp.", market: "US" },
];

export function TradingDeskPanel({
  onRunSuccess,
  onWatched,
}: {
  onRunSuccess: () => void;
  onWatched: () => void;
}) {
  const { blocked, refreshQuota } = useAiAnalysisQuota();
  const [selected, setSelected] = useState<InstrumentSearchResult | null>(null);
  const [result, setResult] = useState<TradingDeskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  async function run() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setSetupMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/trading-desk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: selected.symbol }),
      });
      const json = await res.json();
      if (!res.ok) {
        const parsed = aiRunErrorMessage(json);
        if (parsed.setupMessage) setSetupMessage(parsed.setupMessage);
        else setError(parsed.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json as TradingDeskResult);
      onRunSuccess();
      void refreshQuota();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600">
            <MessageCircleQuestion className="size-6 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-stone-900">Ask five analysts about any stock</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Real quote, fundamentals, charts and headlines go to five AI agents — they read the data, argue both
              sides, and the risk manager gives the final call. Takes 15–30 seconds.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            {selected ? (
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-stone-900">{selected.symbol}</p>
                  <p className="truncate text-sm text-stone-500">{selected.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-sm font-medium text-teal-700 underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <TickerPicker onPick={setSelected} />
            )}
          </div>
          <Button onClick={run} disabled={!selected || loading || blocked} size="lg" className="shrink-0">
            {loading ? "Debating…" : blocked ? "Upgrade to run" : "Run the debate"}
          </Button>
        </div>

        {!selected && !result ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-400">Try a debate on:</span>
            {TRY_TICKERS.map((t) => (
              <button
                key={t.symbol}
                type="button"
                onClick={() =>
                  setSelected({
                    symbol: t.symbol,
                    name: t.name,
                    market: t.market,
                    instrumentKey: null,
                    sector: null,
                    currency: t.market === "IN" ? "INR" : "USD",
                  })
                }
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-600 transition hover:border-teal-500 hover:text-teal-700"
              >
                {t.symbol}
              </button>
            ))}
          </div>
        ) : null}

        {blocked ? (
          <p className="mt-3 text-sm text-stone-500">
            Free monthly limit used.{" "}
            <Link href="/pricing" className="font-semibold text-teal-700 hover:underline">
              Upgrade
            </Link>{" "}
            for unlimited runs.
          </p>
        ) : null}
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-teal-600" />
            </span>
            <p className="text-sm font-medium text-stone-700">The desk is reading real data and debating…</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-stone-500">
            <li>· Fundamental, sentiment and technical analysts gather evidence</li>
            <li>· Bull and bear researchers argue the two sides</li>
            <li>· Trader decides, risk manager approves or overrules</li>
          </ul>
        </div>
      ) : null}

      {result ? <DebateArena result={result} onWatched={onWatched} /> : null}

      {!result && !loading ? (
        <p className="text-center text-sm text-stone-400">
          No debate yet — pick a stock above and press “Run the debate”.
        </p>
      ) : null}
    </div>
  );
}
