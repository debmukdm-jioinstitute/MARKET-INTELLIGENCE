"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Competition,
  Holdings,
  Participant,
  Trade,
} from "@/lib/competition/types";
import {
  loadCompetition,
  sendCompetition,
  money,
  percent,
  StatusMessage,
} from "./shared";
import { CompanyLogo } from "@/components/CompanyLogo";
type Portfolio = {
  competition: Competition;
  participant: Participant | null;
  holdings: Holdings;
  prices: Record<string, number>;
  value: number | null;
  returnPct: number | null;
  delayed: boolean;
  trades: Trade[];
};
const loader = (url: string) => loadCompetition<Portfolio>(url);
export function AlphaPortfolio() {
  const { data, error, mutate } = useSWR("/api/competition/portfolio", loader, {
    refreshInterval: 30_000,
  });
  const [symbol, setSymbol] = useState(""),
    [side, setSide] = useState<"BUY" | "SELL">("BUY"),
    [shares, setShares] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  async function order() {
    setBusy(true);
    setFailure(null);
    setNotice("");
    try {
      await sendCompetition("/api/competition/order", {
        symbol,
        side,
        shares: Number(shares),
        requestId: crypto.randomUUID(),
      });
      setNotice("Virtual order recorded.");
      await mutate();
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My competition portfolio</h1>
      <StatusMessage error={error} />
      {!data ? (
        <p>Loading portfolio…</p>
      ) : !data.participant ? (
        <p>
          <Link
            className="text-primary underline"
            href="/alpha-league#register"
          >
            Register for the league
          </Link>{" "}
          to build your virtual portfolio.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">
            {data.participant.displayName} · {data.participant.status} ·{" "}
            {data.competition.status}
          </p>
          {data.delayed ? (
            <p role="status" className="text-amber-700">
              Data delayed — unavailable prices and totals appear as —.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Cash", money(data.holdings.cash)],
              ["Portfolio value", money(data.value)],
              ["Return", percent(data.returnPct)],
              ["Distinct symbols", `${data.holdings.symbolsTraded.length}/5`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="overflow-x-auto rounded-xl border border-border bg-card p-4">
              <h2 className="mb-4 text-lg font-semibold">Holdings ledger</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Symbol", "Shares", "Last price", "Market value"].map(
                      (t) => (
                        <TableHead key={t}>{t}</TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.holdings.positions).map(([s, q]) => (
                    <TableRow key={s}>
                      <TableCell>{s}</TableCell>
                      <TableCell>{q}</TableCell>
                      <TableCell>{money(data.prices[s])}</TableCell>
                      <TableCell>
                        {money(data.prices[s] ? q * data.prices[s] : null)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!Object.keys(data.holdings.positions).length ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Your virtual cash is ready. No holdings yet.
                </p>
              ) : null}
            </section>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Virtual ticket</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void order();
                }}
                className="mt-4 space-y-4"
              >
                <label className="block text-sm">
                  NSE equity / ETF symbol
                  <Input
                    aria-label="NSE symbol"
                    required
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="RELIANCE"
                    className="mt-1"
                  />
                </label>
                <Select
                  value={side}
                  onValueChange={(v) => setSide(v as "BUY" | "SELL")}
                >
                  <SelectTrigger aria-label="Order side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
                <label className="block text-sm">
                  Whole shares
                  <Input
                    required
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="mt-1"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Cash-funded, long-only orders. 25% symbol cap and 0.12%
                  friction. Fresh prices and an approved safety review are
                  required.
                </p>
                <Button
                  disabled={
                    busy ||
                    data.competition.status !== "live" ||
                    data.participant.status !== "active"
                  }
                >
                  {busy ? "Recording…" : "Place virtual order"}
                </Button>
                <StatusMessage error={failure} />
                {notice ? (
                  <p role="status" className="text-sm text-emerald-700">
                    {notice}
                  </p>
                ) : null}
              </form>
            </section>
          </div>
          <section className="overflow-x-auto rounded-xl border border-border p-4">
            <h2 className="mb-4 text-lg font-semibold">My trade history</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Time (IST)",
                    "Symbol",
                    "Side",
                    "Shares",
                    "Price",
                    "Friction",
                  ].map((t) => (
                    <TableHead key={t}>{t}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data.trades].reverse().map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {new Date(t.tradedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <CompanyLogo symbol={t.symbol} name={t.symbol} size={24} />
                        {t.symbol}
                      </span>
                    </TableCell>
                    <TableCell>{t.side}</TableCell>
                    <TableCell>{t.shares}</TableCell>
                    <TableCell>{money(t.price)}</TableCell>
                    <TableCell>{money(t.brokerage)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
}
