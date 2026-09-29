"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { EditHoldingDialog } from "@/components/my-portfolio/edit-holding-dialog";
import { SellHoldingDialog } from "@/components/my-portfolio/sell-holding-dialog";
import { exportHoldingsCsv } from "@/lib/my-portfolio/india-tax-estimate";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PositionRow } from "@/lib/my-portfolio/types";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

function inr(v: number) {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

type SortKey = "symbol" | "weight" | "dayPct" | "pnlInr";

export function HoldingsList({
  positions,
  onRemove,
  onEdit,
  onSell,
  readOnly,
  emptyAction,
}: {
  positions: PositionRow[];
  onRemove: (id: string) => void;
  onEdit: (id: string, patch: { shares: number; avgCost: number }) => Promise<unknown>;
  onSell: (id: string, input: { shares: number; price: number; tradeDate?: string }) => Promise<unknown>;
  readOnly?: boolean;
  emptyAction?: ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [editRow, setEditRow] = useState<PositionRow | null>(null);
  const [sellRow, setSellRow] = useState<PositionRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    let rows = q
      ? positions.filter((p) => p.symbol.toUpperCase().includes(q) || p.name.toUpperCase().includes(q))
      : [...positions];
    rows.sort((a, b) => {
      if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol);
      if (sortKey === "dayPct") return b.dayPct - a.dayPct;
      if (sortKey === "pnlInr") return b.pnlInr - a.pnlInr;
      return b.weight - a.weight;
    });
    return rows;
  }, [positions, query, sortKey]);

  function downloadCsv() {
    const blob = new Blob([exportHoldingsCsv(positions)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-holdings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!positions.length) {
    return (
      <div className="space-y-3 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Your portfolio is empty — let&apos;s fix that.</p>
        <p className="text-sm text-muted-foreground">
          Add your first stock, Indian or American, and this page will come alive.
        </p>
        {emptyAction ? <div className="flex justify-center pt-1">{emptyAction}</div> : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="search"
          placeholder="Filter symbol or name…"
          className="min-w-[180px] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="weight">Sort: Weight</option>
          <option value="symbol">Sort: Symbol</option>
          <option value="dayPct">Sort: Day %</option>
          <option value="pnlInr">Sort: P&L</option>
        </select>
        <button type="button" onClick={downloadCsv} className="text-sm font-semibold text-blue-600 hover:underline">
          Export CSV
        </button>
      </div>
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
            <TableHead className="text-right">Day</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Avg cost</TableHead>
            <TableHead className="text-right">MV</TableHead>
            <TableHead className="text-right">Wgt</TableHead>
            <TableHead className="text-right">U. P&L</TableHead>
            {!readOnly ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow
              key={row.id}
              className="group cursor-pointer"
              onClick={() => router.push(`/research/${encodeURIComponent(row.symbol)}`)}
            >
              <TableCell className="font-medium text-primary flex items-center gap-1">
                <span className="group-hover:underline underline-offset-2">{row.symbol}</span>
                <span className="text-sm text-muted-foreground">{row.market}</span>
                <ArrowUpRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </TableCell>
              <TableCell className="text-muted-foreground">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.currency === "USD" ? "$" : "₹"}
                {row.last.toFixed(2)}
              </TableCell>
              <TableCell className={cn("text-right tabular-nums", row.dayPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {formatPct(row.dayPct)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.shares}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.currency === "USD" ? "$" : "₹"}
                {row.avgCost.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">{inr(row.marketValueInr)}</TableCell>
              <TableCell className="text-right">{formatPct(row.weight, 1, false)}</TableCell>
              <TableCell className={cn("text-right", row.pnlInr >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {inr(row.pnlInr)}
              </TableCell>
              {!readOnly ? (
                <TableCell className="p-0 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap justify-end gap-1 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setEditRow(row)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellRow(row)}
                      className="text-sm text-amber-700 hover:underline"
                    >
                      Sell
                    </button>
                    <Link
                      href={`/intelligence/alerts?symbol=${encodeURIComponent(row.symbol)}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      Alert
                    </Link>
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      className="text-sm text-muted-foreground hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <EditHoldingDialog
        row={editRow}
        open={Boolean(editRow)}
        onOpenChange={(o) => !o && setEditRow(null)}
        onSave={onEdit}
      />
      <SellHoldingDialog
        row={sellRow}
        open={Boolean(sellRow)}
        onOpenChange={(o) => !o && setSellRow(null)}
        onSell={onSell}
      />
    </>
  );
}
