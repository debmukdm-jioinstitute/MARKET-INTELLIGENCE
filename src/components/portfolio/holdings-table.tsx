"use client";

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
import { formatPct, formatUsd } from "@/lib/format";
import { positionRows } from "@/lib/analytics";
import { UNIVERSE } from "@/lib/universe";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function HoldingsTable() {
  const { active, trade } = usePortfolio();
  const rows = useMemo(() => positionRows(active), [active]);
  const [symbol, setSymbol] = useState("MSFT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [notional, setNotional] = useState("250000");
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="font-heading text-sm font-semibold">Holdings ledger</h3>
          <p className="text-xs text-muted-foreground">Live marks · virtual book · {active.baseCurrency}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
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
                  setOpen(false);
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
          {rows.map((row) => (
            <TableRow key={row.symbol}>
              <TableCell className="font-mono font-medium">{row.symbol}</TableCell>
              <TableCell className="text-muted-foreground">{row.name}</TableCell>
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
    </div>
  );
}
