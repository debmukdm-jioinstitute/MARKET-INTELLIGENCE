"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OptionChainRow, OptionChainSnapshot } from "@/lib/feeds/derivatives/types";
import { cn } from "@/lib/utils";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const col = createColumnHelper<OptionChainRow>();

function moneyness(strike: number, spot: number): "ITM" | "ATM" | "OTM" {
  const pct = Math.abs(strike - spot) / spot;
  if (pct < 0.0025) return "ATM";
  return strike < spot ? "ITM" : "OTM";
}

export function OptionChainTable({ snapshot }: { snapshot: OptionChainSnapshot }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    col.accessor((r) => r.call?.oi ?? 0, { id: "callOi", header: "OI", cell: (c) => fmt(c.getValue(), 0) }),
    col.accessor((r) => r.call?.greeks.iv ?? 0, { id: "callIv", header: "IV", cell: (c) => fmt(c.getValue()) }),
    col.accessor((r) => r.call?.greeks.delta ?? 0, {
      id: "callDelta",
      header: "Delta",
      cell: (c) => fmt(c.getValue()),
    }),
    col.accessor((r) => r.call?.ltp ?? 0, { id: "callLtp", header: "LTP", cell: (c) => fmt(c.getValue()) }),
    col.accessor("strike", {
      header: "Strike",
      cell: (c) => (
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-semibold">{fmt(c.getValue(), 0)}</span>
          <Badge
            variant="outline"
            className={cn(
              "px-1 py-0 text-[9px]",
              moneyness(c.getValue(), snapshot.underlyingSpot) === "ATM" && "border-primary text-primary",
            )}
          >
            {moneyness(c.getValue(), snapshot.underlyingSpot)}
          </Badge>
        </div>
      ),
    }),
    col.accessor((r) => r.put?.ltp ?? 0, { id: "putLtp", header: "LTP", cell: (c) => fmt(c.getValue()) }),
    col.accessor((r) => r.put?.greeks.delta ?? 0, {
      id: "putDelta",
      header: "Delta",
      cell: (c) => fmt(c.getValue()),
    }),
    col.accessor((r) => r.put?.greeks.iv ?? 0, { id: "putIv", header: "IV", cell: (c) => fmt(c.getValue()) }),
    col.accessor((r) => r.put?.oi ?? 0, { id: "putOi", header: "OI", cell: (c) => fmt(c.getValue(), 0) }),
  ];

  const table = useReactTable({
    data: snapshot.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead colSpan={4} className="text-center text-emerald-600">
              CALLS
            </TableHead>
            <TableHead />
            <TableHead colSpan={4} className="text-center text-rose-600">
              PUTS
            </TableHead>
          </TableRow>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  className="cursor-pointer select-none text-right font-mono text-[10px] uppercase"
                  onClick={h.column.getToggleSortingHandler()}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    <ArrowUpDown className="size-3 opacity-40" />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                moneyness(row.original.strike, snapshot.underlyingSpot) === "ATM" && "bg-primary/5",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="text-right font-mono text-xs tabular-nums">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
