"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
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
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1 justify-end">
              Last
              <MetricInfo id="nav" name="Last Traded Price" iconSize="xs" />
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1 justify-end">
              Day
              <MetricInfo id="today_pnl" name="1-Day Gain / Loss" iconSize="xs" />
            </span>
          </TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1 justify-end">
              MV
              <MetricInfo id="nav" name="Total Market Value" iconSize="xs" />
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1 justify-end">
              Wgt
              <MetricInfo id="concentration" name="Holding Weight" iconSize="xs" />
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1 justify-end">
              U. P&L
              <MetricInfo id="total_return" name="Unrealized P&L" iconSize="xs" />
            </span>
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono font-medium text-primary flex items-center gap-1">
              <span>{row.symbol}</span>
              <span className="text-[9px] text-muted-foreground">{row.market}</span>
              <MetricInfo
                id={row.symbol.toLowerCase()}
                name={`${row.name} (${row.symbol})`}
                provider={row.market === "IN" ? "NSE / BSE India Live" : "NASDAQ / NYSE via Yahoo"}
                sourceUrl={
                  row.market === "IN"
                    ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(row.symbol)}`
                    : `https://finance.yahoo.com/quote/${encodeURIComponent(row.symbol)}`
                }
                iconSize="xs"
              />
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
