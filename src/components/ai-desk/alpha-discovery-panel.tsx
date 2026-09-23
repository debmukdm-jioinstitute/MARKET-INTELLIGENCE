"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { TickerPicker, type InstrumentSearchResult } from "@/components/ai-desk/ticker-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
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

export function AlphaDiscoveryPanel() {
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
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <TickerPicker onPick={add} placeholder="Add up to 8 tickers to build a universe…" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {picked.map((p) => (
              <span
                key={p.symbol}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-mono"
              >
                {p.symbol}
                <button type="button" onClick={() => remove(p.symbol)} aria-label={`Remove ${p.symbol}`}>
                  <X className="size-3 text-muted-foreground hover:text-foreground" />
                </button>
              </span>
            ))}
            {picked.length === 0 ? <p className="text-xs text-muted-foreground">No tickers selected yet.</p> : null}
          </div>
          <Button onClick={run} disabled={picked.length === 0 || loading} className="w-full">
            {loading ? "Proposing & backtesting…" : "Discover factors"}
          </Button>
        </div>
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <p className="text-xs text-muted-foreground">
          The LLM proposes candidate factors from a fixed, safe vocabulary; this app backtests each one deterministically
          against real price history — no AI-generated code is ever executed.
        </p>
      ) : null}

      {result ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Universe: {result.symbols.map((s) => `${s.symbol} (${s.points}d)`).join(", ")}
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Factor</th>
                  <th className="px-3 py-2 text-left">Formula</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">IC</th>
                  <th className="px-3 py-2 text-right">Backtest Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {result.factors.map((f, i) => (
                  <tr key={i} className="border-t border-border/60 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium">{f.name}</p>
                      <p className="text-[10px] leading-4 text-muted-foreground">{f.rationale}</p>
                      {f.note ? <p className="text-[10px] text-blue-600">{f.note}</p> : null}
                    </td>
                    <td className="px-3 py-2 font-mono">{f.formula}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] uppercase">
                        {f.category}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono tabular-nums",
                        f.informationCoefficient == null
                          ? "text-muted-foreground/50"
                          : f.informationCoefficient > 0
                            ? "text-emerald-600"
                            : "text-rose-600",
                      )}
                    >
                      {f.informationCoefficient != null ? f.informationCoefficient.toFixed(3) : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {f.backtestSharpe != null ? f.backtestSharpe.toFixed(2) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground/70">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
