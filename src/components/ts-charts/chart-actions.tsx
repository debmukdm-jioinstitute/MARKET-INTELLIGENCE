"use client";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Row = { date: string; [k: string]: number | null | string };

export function rowsToCsv(rows: Row[]): string {
  if (!rows.length) return "date\n";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => (r[c] ?? "")).join(","))].join("\n");
}
const save = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export function ChartActions({ id, title, rows }: { id: string; title: string; rows: Row[] }) {
  const [table, setTable] = useState(false);
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const png = (root: HTMLElement | null) => {
    const svg = root?.closest("section")?.querySelector("svg");
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const k = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = width * k; c.height = height * k;
      const g = c.getContext("2d")!;
      g.fillStyle = getComputedStyle(document.body).getPropertyValue("--paper") || "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => b && save(b, `${id}.png`), "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`${title} actions`} className="min-h-11 min-w-11 rounded border px-2 text-sm sm:min-h-8 sm:min-w-0" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>⋯</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => save(new Blob([rowsToCsv(rows)], { type: "text/csv" }), `${id}.csv`)}>Download CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => png(e.currentTarget as HTMLElement)}>Download image</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTable(true)}>Show table</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(`${location.origin}${location.pathname}#${id}`)}>Copy link</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={table} onOpenChange={setTable}>
        <DialogContent className="max-h-[80vh] overflow-auto">
          <DialogTitle>{title}</DialogTitle>
          <table className="w-full text-sm tabular-nums">
            <thead><tr>{cols.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
            <tbody>{rows.slice(-200).reverse().map((r) => <tr key={r.date}>{cols.map((c) => <td key={c} className="px-2 py-1">{String(r[c] ?? "–")}</td>)}</tr>)}</tbody>
          </table>
        </DialogContent>
      </Dialog>
    </>
  );
}
