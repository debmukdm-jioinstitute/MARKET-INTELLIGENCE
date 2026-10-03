"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BACKTEST_UNIVERSE } from "@/lib/competition/universe";
import type { BacktestRule, SandboxResult } from "@/lib/competition/backtest";
import { sendCompetition, percent, StatusMessage } from "./shared";
// The UI only needs the reference symbols; server data and rule execution stay in server module below.
const templates = [
  { label: "Momentum", condition: "momentum" },
  { label: "RSI mean reversion", condition: "rsi" },
  { label: "Moving-average cross", condition: "maCross" },
] as const;
const defaults: BacktestRule = {
  condition: "momentum",
  fast: 20,
  slow: 50,
  rsiThreshold: 30,
  rsiPeriod: 14,
  stopLoss: 5,
  takeProfit: 10,
};
function FullCurve({ result }: { result: SandboxResult }) {
  const points = result.equity;
  const min = Math.min(...points.map((p) => p.value)),
    max = Math.max(...points.map((p) => p.value)),
    span = max - min || 1;
  const path = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${20 + (i / (points.length - 1)) * 660},${180 - ((p.value - min) / span) * 150}`,
    )
    .join(" ");
  return (
    <figure className="rounded-xl border border-border p-4">
      <figcaption className="font-semibold">
        {result.symbol} · Full daily equity curve
      </figcaption>
      <svg
        viewBox="0 0 700 210"
        className="w-full"
        role="img"
        aria-label={`Daily portfolio value for ${result.symbol}`}
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
        <text x={20} y={205} fontSize={11}>
          {new Date(result.from * 1000).toISOString().slice(0, 10)}
        </text>
        <text x={680} y={205} textAnchor="end" fontSize={11}>
          {new Date(result.to * 1000).toISOString().slice(0, 10)}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">
        Every available daily bar, marked to close. No auto-trading.
      </p>
    </figure>
  );
}
export function AlphaBacktest() {
  const [rule, setRule] = useState(defaults),
    [symbols, setSymbols] = useState("RELIANCE,TCS,INFY"),
    [years, setYears] = useState(1),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<unknown>(null),
    [results, setResults] = useState<SandboxResult[]>([]),
    [unavailable, setUnavailable] = useState<string[]>([]),
    [message, setMessage] = useState("");
  async function run() {
    setBusy(true);
    setFailure(null);
    setMessage("");
    try {
      const data = await sendCompetition("/api/competition/backtest", {
        symbols: symbols
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        years,
        rule,
      });
      setResults(data.results ?? []);
      setUnavailable(data.unavailable ?? []);
      setMessage(`Completed in ${(data.elapsedMs / 1000).toFixed(1)}s.`);
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Research sandbox</h1>
      <p className="text-muted-foreground">
        Test a rule against 1–5 years of historical daily prices. Results are
        research summaries and never place competition orders.
      </p>
      <div className="flex flex-wrap gap-3">
        {templates.map((t) => (
          <Button
            key={t.condition}
            variant={rule.condition === t.condition ? "default" : "outline"}
            onClick={() => setRule({ ...defaults, condition: t.condition })}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3"
      >
        <label className="sm:col-span-2">
          Symbols (comma-separated)
          <Input
            required
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
          />
        </label>
        <label>
          Lookback years
          <Input
            type="number"
            min={1}
            max={5}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </label>
        {(
          [
            ["fast", "Fast MA"],
            ["slow", "Slow MA"],
            ["rsiPeriod", "RSI period"],
            ["rsiThreshold", "RSI threshold"],
            ["stopLoss", "Stop loss %"],
            ["takeProfit", "Take profit %"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <Input
              type="number"
              required
              min={key === "stopLoss" || key === "takeProfit" ? 0.1 : 2}
              max={key === "slow" ? 250 : key === "rsiPeriod" ? 50 : 100}
              step={key === "stopLoss" || key === "takeProfit" ? 0.1 : 1}
              value={rule[key]}
              onChange={(e) =>
                setRule({ ...rule, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-3 sm:col-span-3">
          <Button disabled={busy}>
            {busy ? "Testing historical rules…" : "Run research backtest"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSymbols(BACKTEST_UNIVERSE.join(","))}
          >
            Use reference Nifty 50 universe
          </Button>
        </div>
      </form>
      <StatusMessage error={failure} />
      {message ? <p role="status">{message}</p> : null}
      {unavailable.length ? (
        <p className="text-amber-700">
          Historical data unavailable: {unavailable.join(", ")}. These symbols
          were excluded.
        </p>
      ) : null}
      {results.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Symbol",
                    "Total return",
                    "Max drawdown",
                    "Win rate",
                    "Trades",
                  ].map((t) => (
                    <TableHead key={t}>{t}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.symbol}>
                    <TableCell>{r.symbol}</TableCell>
                    <TableCell>{percent(r.totalReturnPct)}</TableCell>
                    <TableCell>{percent(r.maxDrawdownPct)}</TableCell>
                    <TableCell>{percent(r.winRate)}</TableCell>
                    <TableCell>{r.trades}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <FullCurve result={results[0]} />
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await sendCompetition("/api/competition/watchlist", {
                  symbols: results.slice(0, 5).map((r) => r.symbol),
                });
                setMessage("Research symbols saved to your watchlist.");
              } catch (e) {
                setFailure(e);
              }
            }}
          >
            Send top research symbols to my watchlist
          </Button>
        </>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Universe: the repository's static Nifty 50 reference (
        {BACKTEST_UNIVERSE.length} symbols), with survivorship bias. No
        fundamental value template is offered because this dataset has no
        historical valuations. Signals use the previous close and enter at the
        next open. Stop losses are checked before take-profit when both occur in
        a daily bar; gaps fill at the open. Costs use the same friction rate as
        the competition. Prices are split-adjusted, dividends excluded. Each
        symbol is tested independently with ₹10,00,000; no portfolio-wide
        position cap. Past performance does not predict future returns.
      </p>
    </div>
  );
}
