"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { TickerPicker, type InstrumentSearchResult } from "@/components/ai-desk/ticker-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

type AnalystNote = {
  role: string;
  view: "bullish" | "neutral" | "bearish";
  keyPoints: string[];
  confidence: number;
  dataNote?: string;
};
type DebateNote = { role: string; thesis: string; keyPoints: string[] };
type TraderDecision = { action: "BUY" | "HOLD" | "SELL"; sizeSuggestionPct: number; rationale: string; confidence: number };
type RiskVerdict = {
  approved: boolean;
  finalAction: "BUY" | "HOLD" | "SELL";
  maxPositionPct: number;
  stopLossPct: number;
  rationale: string;
};
type TradingDeskResult = {
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
  return view === "bullish" ? "text-emerald-600" : view === "bearish" ? "text-rose-600" : "text-muted-foreground";
}
function actionColor(action: "BUY" | "HOLD" | "SELL") {
  return action === "BUY" ? "text-emerald-600" : action === "SELL" ? "text-rose-600" : "text-blue-600";
}

export function TradingDeskPanel() {
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
        if (json.setupRequired) setSetupMessage(json.error);
        else setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json as TradingDeskResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          {selected ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="font-mono text-sm font-medium">{selected.symbol}</p>
                <p className="text-xs text-muted-foreground">{selected.name}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-muted-foreground underline">
                Change
              </button>
            </div>
          ) : (
            <TickerPicker onPick={setSelected} />
          )}
        </div>
        <Button onClick={run} disabled={!selected || loading}>
          {loading ? "Debating…" : "Run the desk"}
        </Button>
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <p className="text-xs text-muted-foreground">
          Fundamental, sentiment and technical analysts are reading real data, then the bull, bear, trader and risk
          manager debate it — this takes 15-30 seconds.
        </p>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="font-heading text-sm font-semibold">
                {result.name} <span className="font-mono text-muted-foreground">({result.symbol})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {result.market === "IN" ? "NSE" : "US"} · price {result.price ?? "n/a"}
                {result.changePct != null ? ` (${(result.changePct * 100).toFixed(2)}%)` : ""} · {result.headlineCount}{" "}
                headlines analyzed
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {result.analysts.map((a) => (
              <div key={a.role} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{a.role}</p>
                  <Badge variant="outline" className={cn("h-4 px-1.5 text-[10px] uppercase", viewColor(a.view))}>
                    {a.view}
                  </Badge>
                </div>
                <ul className="mt-2 space-y-1 text-[11px] leading-4 text-muted-foreground">
                  {a.keyPoints.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-muted-foreground/70">confidence {(a.confidence * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {result.debate.map((d) => (
              <div key={d.role} className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-semibold">{d.role}</p>
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{d.thesis}</p>
                <ul className="mt-2 space-y-1 text-[11px] leading-4 text-muted-foreground">
                  {d.keyPoints.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold">Trader</p>
            <p className="mt-1 text-sm">
              <span className={cn("font-semibold", actionColor(result.trader.action))}>{result.trader.action}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                illustrative size {result.trader.sizeSuggestionPct.toFixed(1)}% · confidence{" "}
                {(result.trader.confidence * 100).toFixed(0)}%
              </span>
            </p>
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{result.trader.rationale}</p>
          </div>

          <div className="rounded-lg border-2 border-primary/40 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Risk manager — final call</p>
              <Badge variant={result.risk.approved ? "default" : "destructive"} className="h-5 text-[10px] uppercase">
                {result.risk.approved ? "approved" : "overridden"}
              </Badge>
            </div>
            <p className="mt-1 text-sm">
              <span className={cn("font-semibold", actionColor(result.risk.finalAction))}>{result.risk.finalAction}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                max position {result.risk.maxPositionPct.toFixed(1)}% · stop-loss {result.risk.stopLossPct.toFixed(1)}%
              </span>
            </p>
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{result.risk.rationale}</p>
          </div>

          <p className="text-[10px] text-muted-foreground/70">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
