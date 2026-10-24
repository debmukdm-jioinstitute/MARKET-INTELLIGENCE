"use client";

import { LazyMount } from "@/components/ts-charts/lazy-mount";
import { RangeProvider } from "@/components/ts-charts/range-context";
import { TsChart } from "@/components/ts-charts/ts-chart";
import { TsRange } from "@/components/ts-charts/ts-range";
import type { ListPage, ListRow, TableOut } from "@/lib/indices/tipsheet-indices";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { HeatTable, SimpleTable, heat, href, val } from "./tables";

const load = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
const ink3 = { color: "var(--ink-3)" } as const;
const FAMS = [["", "All"], ["broad", "Broad market"], ["sectoral", "Sectors"], ["thematic", "Themes"], ["strategy", "Strategy and factor"]] as const;
const FAM_NAMES = ["Broad market", "Sectors", "Themes", "Strategy and factor"];
/** Column index in the source table (0 = name, 1 = 52 weeks). */
const RETURNS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TREND = [2, 13, 14, 15, 16, 17, 18, 19];

function Spark({ s }: { s: NonNullable<ListRow["spark"]> }) {
  const end = s.d.split("L").pop()!.split(",").map(Number);
  return (
    <svg width="84" height="22" viewBox="0 0 84 22" aria-hidden>
      <path d={s.d} fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
      <circle cx={end[0]} cy={end[1]} r="2.2" className={s.up ? "fill-blue-600" : "fill-red-600"} />
    </svg>
  );
}

function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: readonly (readonly [T, string])[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className="min-h-11 rounded-full border px-3.5 text-sm touch-manipulation sm:min-h-9"
          style={{ borderColor: "var(--rule)", background: value === k ? "var(--ink)" : "transparent", color: value === k ? "var(--paper)" : "var(--ink-2)" }}>
          {l}
        </button>
      ))}
    </div>
  );
}

function IndexTable({ d }: { d: ListPage }) {
  const [fam, setFam] = useState("");
  const [view, setView] = useState<"returns" | "trend">("returns");
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [sort, setSort] = useState({ col: 9, dir: -1 as 1 | -1 }); // 1Y, high to low
  const cols = view === "returns" ? RETURNS : TREND;
  const count = (f: string) => d.rows.filter((r) => !f || r.group === f).length;
  const sat = useMemo(() => Object.fromEntries(RETURNS.map((c) => [c, Math.max(1, ...d.rows.map((r) => Math.abs(val(r.cells[c - 2]) || 0)))])), [d.rows]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const key = (r: ListRow) => (sort.col === 0 ? r.name : (() => { const c = r.cells[sort.col - 2]; return c.v ?? c.t; })());
    return d.rows
      .filter((r) => (!fam || r.group === fam) && (!needle || r.name.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const x = key(a), y = key(b);
        if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
        if (typeof x === "number") return -1;
        if (typeof y === "number") return 1;
        return String(x).localeCompare(String(y)) * sort.dir;
      });
  }, [d.rows, fam, q, sort]);
  const shown = all || q ? rows : rows.slice(0, 25);
  const th = (col: number, label: string) => (
    <th key={col} scope="col" aria-sort={sort.col === col ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("whitespace-nowrap px-3 py-2 font-medium", col <= 2 ? "text-left" : "text-right")}>
      <button type="button" className="min-h-8 touch-manipulation hover:text-foreground" onClick={() => setSort((s) => ({ col, dir: s.col === col ? (-s.dir as 1 | -1) : col <= 2 ? 1 : -1 }))}>
        {label}{sort.col === col ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={fam} onChange={(v) => { setFam(v); setAll(false); }} label="Index family" items={FAMS.map(([k, l]) => [k, `${l} ${count(k)}`] as const)} />
        <Segmented value={view} onChange={setView} label="View" items={[["returns", "Returns"], ["trend", "Trend and risk"]] as const} />
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an index" aria-label="Find an index"
        className="min-h-11 w-full max-w-sm rounded-lg border bg-transparent px-3 text-sm sm:min-h-9" style={{ borderColor: "var(--rule)" }} />
      <p className="text-sm" style={ink3}>
        {shown.length} of {d.rows.length} indices shown. Sorted by {d.headers[sort.col === 0 ? 0 : sort.col]}. Click a heading to sort and a name for the index's own page. Returns over three years and longer are annualised.
      </p>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--rule)" }}>
        <table className="w-full min-w-[880px] border-collapse text-sm tabular-nums">
          <thead style={ink3}>
            <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
              {th(0, "Index")}
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium">52 weeks</th>
              {cols.map((c) => th(c, d.headers[c]))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.slug} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                <th scope="row" className="sticky left-0 z-10 min-w-[11rem] bg-card px-3 py-2 text-left font-normal">
                  <Link href={href(r.slug)} className="underline decoration-border underline-offset-4 hover:decoration-foreground">{r.name}</Link>
                </th>
                <td className="px-3 py-2">{r.spark ? <Spark s={r.spark} /> : null}</td>
                {cols.map((c) => {
                  const cell = r.cells[c - 2];
                  return <td key={c} style={c >= 3 && c <= 12 ? heat(val(cell), sat[c] * 0.7) : undefined} className={cn("px-3 py-2", c === 2 || c === 16 ? "text-left" : "text-right")}>{cell.t}</td>;
                })}
              </tr>
            ))}
            {!shown.length ? <tr><td colSpan={cols.length + 2} className="px-3 py-6 text-center" style={ink3}>No index matches.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {!all && !q && rows.length > 25 ? (
        <button type="button" onClick={() => setAll(true)} className="min-h-11 rounded-full border px-4 text-sm sm:min-h-9" style={{ borderColor: "var(--rule)" }}>Show all {rows.length} indices</button>
      ) : null}
    </div>
  );
}

function Heat({ title, intro, tables, sat }: { title: string; intro: string; tables: TableOut[]; sat: number }) {
  const [i, setI] = useState(0);
  const [old, setOld] = useState(false);
  const t = tables[i];
  if (!t) return null;
  return (
    <section className="space-y-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="max-w-3xl text-sm" style={{ color: "var(--ink-2)" }}>{intro}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={String(i)} onChange={(v) => setI(Number(v))} label="Family" items={tables.map((x, k) => [String(k), `${FAM_NAMES[k] ?? k} ${x.rows.length}`] as const)} />
        <button type="button" aria-pressed={old} onClick={() => setOld(!old)} className="min-h-11 rounded-full border px-3.5 text-sm sm:min-h-9" style={{ borderColor: "var(--rule)" }}>Show oldest first</button>
      </div>
      <HeatTable t={t} sat={sat} oldestFirst={old} />
      <p className="text-xs" style={ink3}>{t.caption.replace(/Show oldest first$/, "")}</p>
    </section>
  );
}

/** NSE index board: every index with returns, trend and risk, launch evidence, calendar years, falls, months and 52-week highs. */
export default function IndicesBoard() {
  const { data, error } = useSWR<ListPage>("/api/indices/tipsheet", load, { revalidateOnFocus: false });
  if (error) return <p className="py-10 text-center text-sm" style={ink3}>Index data is unavailable right now. Try again shortly.</p>;
  if (!data) return <p className="py-10 text-center text-sm" style={ink3} aria-busy>Loading indices…</p>;
  const by = (re: RegExp) => data.tables.filter((t) => re.test(t.caption) && t.headers[0] === "");
  const launch = data.tables.filter((t) => t.headers[0] === "Group" || t.headers[0] === "Index");
  return (
    <div className="space-y-8" style={{ color: "var(--ink)" }}>
      <header>
        <p className="max-w-3xl text-sm" style={{ color: "var(--ink-2)" }}>
          Every NSE index: returns, trend and risk. Total returns with dividends reinvested, to {data.asOf}. Source: NSE Indices, compiled by tipsheet.markets.
        </p>
      </header>
      <IndexTable d={data} />

      {launch.length ? (
        <section className="space-y-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
          <h3 className="text-xl font-semibold tracking-tight">Before and after launch</h3>
          <p className="max-w-3xl text-sm" style={{ color: "var(--ink-2)" }}>Most NSE indices come with history calculated before they existed. Each index's lead over the Nifty 500 before its launch date is compared with its lead after.</p>
          {launch.map((t, i) => <SimpleTable key={i} t={t} />)}
        </section>
      ) : null}

      <Heat title="Calendar years" intro="Every index's return in each calendar year, with dividends. Read down a column to see what led in a year, across a row to see how uneven one index's years are." tables={by(/^Calendar-year/)} sat={50} />
      <Heat title="The falls within each year" intro="The largest fall from a peak within each calendar year, counting the previous year-end as the first peak." tables={by(/largest fall/)} sat={40} />
      <Heat title="The last 12 months" intro="The same families month by month, on a tighter colour scale. The latest month is month to date." tables={by(/monthly/)} sat={10} />

      {data.charts.length ? (
        <RangeProvider initial="10Y">
          <section className="space-y-4 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold tracking-tight">Highs and lows</h3>
              <TsRange spanYears={20} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {data.charts.map((c) => <LazyMount key={c.id}><TsChart id={c.id} /></LazyMount>)}
            </div>
          </section>
        </RangeProvider>
      ) : null}
    </div>
  );
}
