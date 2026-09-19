"use client";

import { SecurityDetailDialog } from "@/components/portfolio/security-detail-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct, formatUsd } from "@/lib/format";
import { positionRows } from "@/lib/analytics";
import { UNIVERSE } from "@/lib/universe";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function HoldingsTable() {
  const { active, trade } = usePortfolio();
  const { data: feedData } = useFeedHub(60_000);
  const live = quoteMap(feedData);
  const rows = useMemo(() => positionRows(active), [active]);
  const [symbol, setSymbol] = useState("MSFT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [notional, setNotional] = useState("250000");
  const [ticketOpen, setTicketOpen] = useState(false);
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const enriched = rows.map((row) => {
    const q = live.get(row.symbol);
    const last = q?.price ?? row.last;
    const dayPct = q?.changePct ?? row.dayPct;
    const marketValue = row.shares * last;
    const pnl = (last - row.avgCost) * row.shares;
    return { ...row, last, dayPct, marketValue, pnl, live: Boolean(q) };
  });

  const detailPosition = enriched.find((r) => r.symbol === detailSymbol);

  function openDetail(sym: string) {
    setDetailSymbol(sym);
    setDetailOpen(true);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="font-heading text-sm font-semibold">Holdings ledger</h3>
          <p className="text-xs text-muted-foreground">
            Live marks · virtual book · {active.baseCurrency}
            <span className="ml-1 text-muted-foreground/80">· Click symbol or name for details</span>
          </p>
        </div>
        <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Virtual ticket</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSE.map((u) => (
                    <SelectItem key={u.symbol} value={u.symbol}>
                      {u.symbol} · {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={side} onValueChange={(v) => setSide(v as "BUY" | "SELL")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={notional}
                onChange={(e) => setNotional(e.target.value)}
                placeholder="Notional USD"
              />
              <Button
                onClick={() => {
                  trade(symbol, side, Number(notional));
                  setTicketOpen(false);
                }}
              >
                Execute
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Last</TableHead>
            <TableHead className="text-right">Day</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">MV</TableHead>
            <TableHead className="text-right">Wgt</TableHead>
            <TableHead className="text-right">U. P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enriched.map((row) => (
            <TableRow key={row.symbol} className="group">
              <TableCell className="p-0">
                <button
                  type="button"
                  onClick={() => openDetail(row.symbol)}
                  className="w-full px-4 py-2 text-left font-mono font-medium text-primary hover:underline"
                >
                  {row.symbol}
                  {row.live ? <span className="ml-1 text-[9px] text-emerald-400">●</span> : null}
                </button>
              </TableCell>
              <TableCell className="p-0">
                <button
                  type="button"
                  onClick={() => openDetail(row.symbol)}
                  className="w-full px-4 py-2 text-left text-muted-foreground hover:text-foreground hover:underline"
                >
                  {row.name}
                </button>
              </TableCell>
              <TableCell className="text-right font-mono">{row.last.toFixed(2)}</TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono",
                  row.dayPct >= 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {formatPct(row.dayPct)}
              </TableCell>
              <TableCell className="text-right font-mono">{row.shares.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{formatUsd(row.marketValue)}</TableCell>
              <TableCell className="text-right font-mono">{formatPct(row.weight, 1)}</TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono",
                  row.pnl >= 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {formatUsd(row.pnl)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SecurityDetailDialog
        symbol={detailSymbol}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        position={
          detailPosition
            ? {
                shares: detailPosition.shares,
                avgCost: detailPosition.avgCost,
                marketValue: detailPosition.marketValue,
                weight: detailPosition.weight,
                pnl: detailPosition.pnl,
                dayPct: detailPosition.dayPct,
              }
            : undefined
        }
      />
    </div>
  );
}
