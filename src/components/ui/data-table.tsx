"use client";

import { cn } from "@/lib/utils";
import { useMemo, useState, type ReactNode } from "react";

export type DataColumn<T> = {
  key: string;
  label: string;
  /** Right-aligned, tabular figures. */
  numeric?: boolean;
  /** Value used for sorting and CSV. Omit to disable sorting. */
  value?: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
  /** Shown by default. Defaults to true. */
  defaultVisible?: boolean;
};

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Table that meets the table spec: sticky header, first column stays visible on wide data,
 * numbers right-aligned with tabular figures, explicit sort direction, column chooser with reset,
 * and CSV export of the visible columns.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  filename,
  summary,
  maxHeightClass = "max-h-[32rem]",
}: {
  caption: string;
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  filename: string;
  /** Plain-language summary of active filters, e.g. "Scan: 52-week breakout". */
  summary?: string;
  maxHeightClass?: string;
}) {
  const defaults = useMemo(() => new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key)), [columns]);
  const [visible, setVisible] = useState<Set<string>>(defaults);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  // The first column is always shown so rows stay identifiable.
  const cols = columns.filter((c, i) => i === 0 || visible.has(c.key));

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    const get = col.value;
    return [...rows].sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key !== key ? { key, dir: "desc" } : s.dir === "desc" ? { key, dir: "asc" } : null));
  }

  function download() {
    const head = cols.map((c) => c.label);
    const body = sorted.map((r) => cols.map((c) => String(c.value?.(r) ?? "")));
    const blob = new Blob([[head, ...body].map((r) => r.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const isDefault = visible.size === defaults.size && [...visible].every((k) => defaults.has(k));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {summary ? `${summary} · ` : ""}{rows.length} row{rows.length === 1 ? "" : "s"}
          {sort ? ` · sorted by ${columns.find((c) => c.key === sort.key)?.label}, ${sort.dir === "desc" ? "high to low" : "low to high"}` : ""}
        </p>
        <div className="flex items-center gap-3">
          <details className="relative">
            <summary className="cursor-pointer text-primary underline-offset-2 hover:underline">Columns</summary>
            <div className="absolute right-0 z-20 mt-1 w-48 space-y-1 rounded-md border border-border bg-card p-2 shadow">
              {columns.map((c, i) => (
                <label key={c.key} className="flex items-center gap-2 text-foreground">
                  <input
                    type="checkbox"
                    checked={i === 0 || visible.has(c.key)}
                    disabled={i === 0}
                    onChange={(e) =>
                      setVisible((v) => {
                        const n = new Set(v);
                        if (e.target.checked) n.add(c.key); else n.delete(c.key);
                        return n;
                      })
                    }
                  />
                  {c.label}
                </label>
              ))}
              <button type="button" disabled={isDefault} onClick={() => setVisible(new Set(defaults))} className="text-primary underline-offset-2 hover:underline disabled:opacity-40">
                Reset to default
              </button>
            </div>
          </details>
          <button type="button" onClick={download} className="text-primary underline-offset-2 hover:underline">Download CSV</button>
        </div>
      </div>

      <div className={cn("overflow-auto rounded-md border border-border", maxHeightClass)}>
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {cols.map((c, i) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.value ? "none" : undefined}
                    className={cn(
                      "sticky top-0 z-10 bg-muted px-2 py-1.5 font-medium text-muted-foreground",
                      c.numeric ? "text-right" : "text-left",
                      i === 0 && "left-0 z-20",
                    )}
                  >
                    {c.value ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {c.label}
                        <span aria-hidden className="text-[10px]">{active ? (sort!.dir === "desc" ? "▼" : "▲") : "↕"}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={rowKey(r)} className="border-t border-border/50 hover:bg-muted/40">
                {cols.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-2 py-1.5",
                      c.numeric && "text-right tabular-nums",
                      i === 0 && "sticky left-0 z-[1] bg-card",
                    )}
                  >
                    {c.render ? c.render(r) : String(c.value?.(r) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
