"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import { UNIVERSE } from "@/lib/universe";
import { cn } from "@/lib/utils";

export default function MarketsPage() {
  const rows = UNIVERSE.map((u) => ({
    ...u,
    last: lastClose(u.symbol),
    d1: getReturn(u.symbol, 1),
    m1: getReturn(u.symbol, 21),
    y1: getReturn(u.symbol, 252),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Market data"
        title="Investable universe"
        subtitle="Equities, duration, credit, commodities, and dollar — one tape, factor-consistent simulated history from 2019."
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">1D</TableHead>
              <TableHead className="text-right">1M</TableHead>
              <TableHead className="text-right">1Y</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.symbol}>
                <TableCell className="font-mono">{row.symbol}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.assetClass}</TableCell>
                <TableCell className="text-right font-mono">{row.last.toFixed(2)}</TableCell>
                <Chg v={row.d1} />
                <Chg v={row.m1} />
                <Chg v={row.y1} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Chg({ v }: { v: number }) {
  return (
    <TableCell className={cn("text-right font-mono", v >= 0 ? "text-emerald-400" : "text-rose-400")}>
      {formatPct(v)}
    </TableCell>
  );
}
