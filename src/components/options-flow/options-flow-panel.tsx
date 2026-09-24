"use client";

import { ErrorBanner, SetupBanner } from "@/components/ai-desk/setup-banner";
import { DataInfo } from "@/components/feeds/data-info";
import { UniversePicker } from "@/components/options-flow/universe-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldSource } from "@/lib/feeds/india/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, HelpCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SourcedField<T> = { status: "ok"; value: T; source: FieldSource } | { status: "unavailable"; reason: string };

type OptionsFlowRecord = {
  symbol: string;
  name: string;
  price: SourcedField<number>;
  priceChangePct: SourcedField<number>;
  volume: SourcedField<number>;
  volumeAvg30: SourcedField<number>;
  callsVolume: SourcedField<number>;
  putsVolume: SourcedField<number>;
  activeStrikeOiChanges: SourcedField<{ strike: number; side: "call" | "put"; oi: number; prevOi: number; change: number }[]>;
  earningsEvent: SourcedField<string>;
  corporateActionEvent: SourcedField<string>;
};

type AnalysisOutput = {
  symbol: string;
  volumeVsRange: string;
  callPutRatioNote: string;
  openInterestNote: string;
  priceConfirmationNote: string;
  scheduledEventNote: string;
  flagged: boolean;
  uncertaintyNote: string;
  unusualnessScore: number;
};

type FlagCandidate = {
  symbol: string;
  whatIsUnusual: string;
  openInterestConfirmsOpened: boolean;
  boringExplanation: string;
  whatToFindOut: string;
  confidence: "low" | "medium" | "high";
};

type Result = {
  asOf: string;
  records: OptionsFlowRecord[];
  analysis: AnalysisOutput[];
  flagging: { candidates: FlagCandidate[]; nothingUnusualNote: string | null; researchQuestion: string | null };
  disclaimer: string;
};

type FoInstrument = { symbol: string; name: string };

const DEFAULT_MAX = 20;
const DEFAULT_GRID_SIZE = 40;
const CONFIDENCE_STYLE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-600/15 text-blue-600",
  high: "bg-rose-500/15 text-rose-600",
};

function Field({ field, fmt }: { field: SourcedField<number>; fmt?: (v: number) => string }) {
  if (field.status === "unavailable") {
    return <span className="text-muted-foreground/60" title={field.reason}>UNAVAILABLE</span>;
  }
  return (
    <span className="inline-flex items-center">
      {fmt ? fmt(field.value) : field.value}
      <DataInfo source={field.source} />
    </span>
  );
}

export function OptionsFlowPanel() {
  const router = useRouter();
  const [universe, setUniverse] = useState<FoInstrument[]>([]);
  const [universeLoaded, setUniverseLoaded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
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
    fetch("/api/portfolio/holdings")
      .then((r) => r.json())
      .then((json) => {
        const holdings: { market: string; symbol: string }[] = json.holdings ?? [];
        const inUniverse = new Set(universe.map((i) => i.symbol));
        const symbols = [...new Set(holdings.filter((h) => h.market === "IN").map((h) => h.symbol.toUpperCase()))]
          .filter((s) => inUniverse.has(s))
          .slice(0, DEFAULT_MAX);
        setPortfolioSymbols(symbols);
        if (!touchedRef.current) setSelected(symbols);
      })
      .catch(() => setPortfolioSymbols([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universeLoaded]);

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
            Data agent pulls price/volume and today&apos;s option chain live; the options-volume 30-day baseline builds up
            day by day via the daily cron, so early runs may show &quot;insufficient history&quot;.
          </p>
          <Button onClick={run} disabled={selected.length === 0 || loading} className="w-full">
            {loading ? "Gathering, analyzing, flagging…" : "Run screener"}
          </Button>
        </div>
      </div>

      {setupMessage ? <SetupBanner message={setupMessage} /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {result ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Data agent — gathered, not analyzed
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
                  {result.records.map((r) => (
                    <tr
                      key={r.symbol}
                      className="cursor-pointer border-t border-border/60 hover:bg-muted/50"
                      onClick={() => router.push(`/research/${encodeURIComponent(r.symbol)}`)}
                    >
                      <td className="px-3 py-2 font-medium text-primary hover:underline">{r.symbol}</td>
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
          </section>

          <section className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Analysis agent — describes the gap, never bullish/bearish
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {result.analysis.map((a) => (
                <div
                  key={a.symbol}
                  className={cn(
                    "space-y-1.5 rounded-lg border p-3 text-sm",
                    a.flagged ? "border-blue-600/40 bg-blue-600/5" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{a.symbol}</span>
                    {a.flagged ? (
                      <Badge className="h-4 bg-blue-600/20 px-1.5 text-sm text-blue-600">FLAGGED</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">{a.volumeVsRange}</p>
                  <p className="text-muted-foreground">{a.callPutRatioNote}</p>
                  <p className="text-muted-foreground">{a.openInterestNote}</p>
                  <p className="text-muted-foreground">{a.priceConfirmationNote}</p>
                  {a.flagged ? <p className="text-blue-600/90">{a.uncertaintyNote}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Flagging agent — research shortlist, at most 5
            </p>
            {result.flagging.candidates.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                {result.flagging.nothingUnusualNote}
              </p>
            ) : (
              <div className="space-y-2">
                {result.flagging.candidates.map((c, i) => (
                  <div key={c.symbol} className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        #{i + 1} {c.symbol}
                      </span>
                      <Badge className={cn("h-4 px-1.5 text-sm uppercase", CONFIDENCE_STYLE[c.confidence])}>
                        {c.confidence} confidence
                      </Badge>
                    </div>
                    <p>{c.whatIsUnusual}</p>
                    <p className="text-muted-foreground">
                      OI confirms new positions opened: <span className="font-medium">{c.openInterestConfirmsOpened ? "yes" : "no"}</span>
                    </p>
                    <p className="text-muted-foreground">Boring explanation: {c.boringExplanation}</p>
                    <p className="text-muted-foreground">To find out: {c.whatToFindOut}</p>
                  </div>
                ))}
                {result.flagging.researchQuestion ? (
                  <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                    <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
                    {result.flagging.researchQuestion}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <p className="text-sm leading-4 text-muted-foreground/70">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
