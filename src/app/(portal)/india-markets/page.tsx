"use client";

import { SecuritySheet } from "@/components/india-markets/security-sheet";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIndiaEquities } from "@/hooks/use-india-equities";
import { INDIA_EQUITIES, type IndiaInstrument } from "@/lib/feeds/india/instruments";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function IndiaMarketsPage() {
  const { quotes, loading, error } = useIndiaEquities();
  const [selected, setSelected] = useState<IndiaInstrument | null>(null);
  const live = new Map(quotes.map((q) => [q.symbol, q]));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="India"
        title="India markets"
        subtitle="NSE equities — live via Upstox (exchange-licensed). Click a row for full quote, depth, candles, and fundamentals."
      />
      <MarketStatusBadge />
      {loading && !quotes.length ? (
        <p className="text-sm text-muted-foreground">Connecting to Upstox…</p>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">Chg</TableHead>
              <TableHead className="text-right">Chg %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDIA_EQUITIES.map((inst) => {
              const q = live.get(inst.symbol);
              return (
                <TableRow
                  key={inst.symbol}
                  className="cursor-pointer"
                  onClick={() => setSelected(inst)}
                >
                  <TableCell className="font-mono">
                    {inst.symbol}
                    {q ? <span className="ml-1 text-[9px] uppercase text-emerald-400">live</span> : null}
                  </TableCell>
                  <TableCell>{inst.name}</TableCell>
                  <TableCell className="text-muted-foreground">{inst.sector}</TableCell>
                  <TableCell className="text-right font-mono">
                    {q ? q.price.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      (q?.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {q ? q.change.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      (q?.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {q ? formatPct(q.changePct) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <SecuritySheet
        instrument={selected}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
