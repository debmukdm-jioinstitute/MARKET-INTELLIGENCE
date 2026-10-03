"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { UniversePicker } from "@/components/options-flow/universe-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useAiAnalysisQuota } from "@/hooks/use-ai-analysis-quota";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { aiRunErrorMessage } from "@/lib/ai/run-response";
import { useEffect, useMemo, useRef, useState } from "react";
import { AgentPipeline } from "./agent-pipeline";
import { recordFirstFlag } from "./progress";
import type { OptionsFlowResult } from "./types";

type FoInstrument = { symbol: string; name: string };

const DEFAULT_MAX = 20;
const DEFAULT_GRID_SIZE = 40;

export function OptionsFlowPanel() {
  const { blocked, refreshQuota } = useAiAnalysisQuota();
  const { holdings } = useMyPortfolio();
  const [universe, setUniverse] = useState<FoInstrument[]>([]);
  const [universeLoaded, setUniverseLoaded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<OptionsFlowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const touchedRef = useRef(false);

  // The full NSE F&O universe (~210 names, synced weekly from Upstox's instrument master) — not a
  // hardcoded shortlist, so search can find and add any optionable ticker, not just a preset 12.
  useEffect(() => {
    fetch("/api/options-flow/universe")
      .then((r) => r.json())
      .then((json) => setUniverse(json.instruments ?? []))
      .catch(() => setUniverse([]))
      .finally(() => setUniverseLoaded(true));
  }, []);

  // Suggest the user's own F&O-eligible holdings as the starting watchlist instead of an arbitrary default —
  // only run once the universe has loaded, so "eligible" is checked against the real list, not an empty one.
  useEffect(() => {
    if (!universeLoaded) return;
    const inUniverse = new Set(universe.map((i) => i.symbol));
    const symbols = [...new Set(holdings.filter((h) => h.market === "IN").map((h) => h.symbol.toUpperCase()))]
      .filter((s) => inUniverse.has(s))
      .slice(0, DEFAULT_MAX);
    setPortfolioSymbols(symbols);
    if (!touchedRef.current) setSelected(symbols);
  }, [universeLoaded, holdings, universe]);

  const filteredEquities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return universe;
    return universe.filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
  }, [universe, query]);

  // With no search, show selected tickers plus a manageable slice of the ~210-name universe rather
  // than dumping every row — searching still reaches the full list via `filteredEquities` above.
  const displayedEquities = useMemo(() => {
    if (query.trim()) return filteredEquities;
    const selectedSet = new Set(selected);
    const selectedFirst = universe.filter((i) => selectedSet.has(i.symbol));
    const rest = universe.filter((i) => !selectedSet.has(i.symbol)).slice(0, Math.max(0, DEFAULT_GRID_SIZE - selectedFirst.length));
    return [...selectedFirst, ...rest];
  }, [universe, selected, query, filteredEquities]);

  function toggle(symbol: string) {
    touchedRef.current = true;
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
        const parsed = aiRunErrorMessage(json);
        if (parsed.setupMessage) setSetupMessage(parsed.setupMessage);
        else setError(parsed.error ?? `HTTP ${res.status}`);
        return;
      }
      const typed = json as OptionsFlowResult;
      setResult(typed);
      if (typed.flagging.candidates.length > 0) recordFirstFlag();
      void refreshQuota();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={universeLoaded ? `Search all ${universe.length} F&O scrips to add…` : "Loading F&O universe…"}
              className="pl-8"
            />
          </div>
          {query.trim() ? (
            <p className="text-sm text-muted-foreground">
              {filteredEquities.length} match{filteredEquities.length === 1 ? "" : "es"}
            </p>
          ) : universe.length > DEFAULT_GRID_SIZE ? (
            <p className="text-sm text-muted-foreground">
              Showing {Math.min(universe.length, DEFAULT_GRID_SIZE)} of {universe.length} — search to find others.
            </p>
          ) : null}
          {portfolioSymbols && portfolioSymbols.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                touchedRef.current = true;
                setSelected(portfolioSymbols);
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Use my portfolio ({portfolioSymbols.length})
            </button>
          ) : portfolioSymbols && portfolioSymbols.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No portfolio holdings are in this app&apos;s F&O watchlist — search above to add tickers.
            </p>
          ) : null}
          <UniversePicker
            symbols={displayedEquities}
            selected={selected}
            onToggle={toggle}
            onSelectAll={() => {
              touchedRef.current = true;
              setSelected(filteredEquities.slice(0, DEFAULT_MAX).map((i) => i.symbol));
            }}
            onClear={() => {
              touchedRef.current = true;
              setSelected([]);
            }}
            max={DEFAULT_MAX}
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <p className="text-sm text-muted-foreground">
            The data agent pulls price/volume and today&apos;s option chain live; the options-volume 30-day baseline
            builds up day by day via the daily cron, so early runs may show &quot;insufficient history&quot;.
          </p>
          <Button onClick={run} disabled={selected.length === 0 || loading || blocked} className="w-full">
            {loading ? "Gathering, analyzing, flagging…" : "Run screener"}
          </Button>
        </div>
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <AgentPipeline result={result} loading={loading} />
    </div>
  );
}
