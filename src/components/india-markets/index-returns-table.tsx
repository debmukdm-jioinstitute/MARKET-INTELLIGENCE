"use client";

import type { IndexReturnRow, IndexReturnsPayload, Period } from "@/lib/feeds/india/index-returns";
import { PERIODS } from "@/lib/feeds/india/index-returns";
import { indexSlugFromLabel } from "@/lib/india-index-meta";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SortKey = Period | "name" | "family";

const fmt = (v: number | null) => (v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`);

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 80, 2 + (hi === lo ? 8 : (1 - (v - lo) / (hi - lo)) * 16)] as const);
  const [lx, ly] = pts[pts.length - 1]!;
  const up = data[data.length - 1]! >= data[0]!;
  return (
    <svg viewBox="0 0 84 20" className="h-5 w-[84px]" aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
      <circle cx={lx} cy={ly} r="2.2" className={up ? "fill-blue-600" : "fill-red-600"} />
    </svg>
  );
}

/** Blue for gains, red for losses; opacity scales with size against the column's biggest move. */
function heat(v: number | null, max: number) {
  if (v == null || max === 0) return undefined;
  const a = Math.min(Math.abs(v) / max, 1) * 0.28;
  return { backgroundColor: v >= 0 ? `rgba(37,99,235,${a})` : `rgba(220,38,38,${a})` };
}

export function IndexReturnsTable() {
  const [data, setData] = useState<IndexReturnsPayload | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "1Y", dir: -1 });

  useEffect(() => {
    let off = false;
    fetch("/api/indices/returns")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: IndexReturnsPayload) => !off && setData(d))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const val = (r: IndexReturnRow) => (sort.key === "name" ? r.name : sort.key === "family" ? r.family : r.returns[sort.key]);
    return [...data.rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null) return 1; // missing history always last
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
    });
  }, [data, sort]);

  const max = useMemo(
    () => Object.fromEntries(PERIODS.map((p) => [p, Math.max(0, ...(data?.rows ?? []).map((r) => Math.abs(r.returns[p] ?? 0)))])) as Record<Period, number>,
    [data],
  );

  const th = (k: SortKey, label: string, right = false) => (
    <th
      key={k}
      scope="col"
      aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
      className={cn("whitespace-nowrap px-3 py-2 font-medium", right ? "text-right" : "text-left")}
    >
      <button
        type="button"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (-s.dir as 1 | -1) : k === "name" || k === "family" ? 1 : -1 }))}
        className="min-h-8 touch-manipulation hover:text-foreground"
      >
        {label}
        {sort.key === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Indian markets</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        NSE index returns{data ? ` as of ${data.asOf}` : ""}. Source: NSE daily index close archive. Price returns; 3Y, 5Y and 10Y are annualised; “–” means the index did not exist then.
      </p>
      {error ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Index returns are unavailable right now. Try again shortly.</p>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-muted-foreground" aria-busy>
          Loading index returns…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[960px] border-collapse text-sm tabular-nums">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                {th("name", "Index")}
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  52 weeks
                </th>
                {th("family", "Family")}
                {PERIODS.map((p) => th(p, p, true))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const slug = indexSlugFromLabel(r.name);
                return (
                  <tr key={r.name} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal">
                      {slug ? (
                        <Link href={`/markets/india/${slug}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="underline decoration-border underline-offset-4">{r.name}</span>
                      )}
                    </th>
                    <td className="px-3 py-2">
                      <Spark data={r.spark} />
                    </td>
                    <td className="px-3 py-2">{r.family}</td>
                    {PERIODS.map((p) => (
                      <td key={p} style={heat(r.returns[p], max[p])} className="px-3 py-2 text-right">
                        {fmt(r.returns[p])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
