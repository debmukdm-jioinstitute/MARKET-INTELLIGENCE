"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PositionRow } from "@/lib/my-portfolio/types";

function inr(v: number) {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function HoldingsList({
  positions,
  onRemove,
}: {
  positions: PositionRow[];
  onRemove: (id: string) => void;
}) {
  if (!positions.length) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No holdings yet — add your first India or US stock to start tracking.
      </p>
    );
  }
  return (
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
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono font-medium text-primary">
              {row.symbol}
              <span className="ml-1 text-[9px] text-muted-foreground">{row.market}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.name}</TableCell>
            <TableCell className="text-right font-mono">
              {row.currency === "USD" ? "$" : "₹"}
              {row.last.toFixed(2)}
            </TableCell>
            <TableCell className={cn("text-right font-mono", row.dayPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {formatPct(row.dayPct)}
            </TableCell>
            <TableCell className="text-right font-mono">{row.shares}</TableCell>
            <TableCell className="text-right font-mono">{inr(row.marketValueInr)}</TableCell>
            <TableCell className="text-right font-mono">{formatPct(row.weight, 1, false)}</TableCell>
            <TableCell className={cn("text-right font-mono", row.pnlInr >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {inr(row.pnlInr)}
            </TableCell>
            <TableCell className="p-0">
              <button
                type="button"
                onClick={() => onRemove(row.id)}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-rose-400"
              >
                Remove
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
