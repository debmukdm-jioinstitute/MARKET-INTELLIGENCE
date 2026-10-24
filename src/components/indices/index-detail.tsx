"use client";

import { LazyMount } from "@/components/ts-charts/lazy-mount";
import { RangeProvider } from "@/components/ts-charts/range-context";
import { TsChart } from "@/components/ts-charts/ts-chart";
import { TsRange } from "@/components/ts-charts/ts-range";
import type { IndexPage, TableOut } from "@/lib/indices/tipsheet-indices";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { SimpleTable, val } from "./tables";

const load = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
const ink3 = { color: "var(--ink-3)" } as const;

/** Each calendar year: total return and the largest fall from a peak within it. Built from the year-by-year table. */
function YearBars({ t }: { t: TableOut }) {
  const ret = t.headers.findIndex((h) => /^Total return/.test(h)) - 1;
  const fall = t.headers.findIndex((h) => /^Worst fall/.test(h)) - 1;
  if (ret < 0 || fall < 0) return null;
  const data = [...t.rows].reverse().map((r) => ({ year: r.label.replace(/ so far/, " YTD"), ret: val(r.cells[ret]), fall: val(r.cells[fall]) }));
  const f = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
  return (
    <div className="ts-chart h-[260px] sm:h-[340px]">
      <ResponsiveContainer debounce={120}>
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fontSize: 11, fill: "var(--ink-3)" }} minTickGap={12} />
          <YAxis orientation="right" tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip formatter={(v) => f(Number(v))} cursor={{ fill: "var(--paper-2)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ret" name="Total return over the year" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.year} fill={d.ret < 0 ? "var(--neg)" : "var(--s1)"} />)}
          </Bar>
          <Bar dataKey="fall" name="Largest fall within the year" fill="var(--hist)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** One NSE index: returns, years, falls, holding outcomes, risk, valuation, holdings, versus the Nifty 500, models and ETFs. */
export default function IndexDetail({ slug }: { slug: string }) {
  const { data, error } = useSWR<IndexPage>(`/api/indices/tipsheet?slug=${slug}`, load, { revalidateOnFocus: false });
  if (error) return <p className="py-10 text-center text-sm" style={ink3}>This index is unavailable right now. <Link className="underline" href="/markets/india">Back to all indices</Link></p>;
  if (!data) return <p className="py-10 text-center text-sm" style={ink3} aria-busy>Loading index…</p>;
  return (
    <div className="space-y-8 pb-12" style={{ color: "var(--ink)" }}>
      <header className="space-y-3">
        <Link href="/markets/india" className="inline-flex min-h-11 items-center text-sm underline sm:min-h-9" style={ink3}>← All indices</Link>
        <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
        <p className="text-sm" style={ink3}>NSE index. Total return with dividends reinvested, to {data.asOf}. Figures before launch use NSE's back-calculated history.</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.kpis.map((k) => (
            <div key={k.label} className="rounded-xl border p-3" style={{ borderColor: "var(--rule)" }}>
              <dt className="text-xs" style={ink3}>{k.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{k.value}</dd>
              {k.sub ? <p className="text-xs" style={ink3}>{k.sub}</p> : null}
            </div>
          ))}
        </dl>
        <nav aria-label="On this page" className="flex flex-wrap gap-2">
          {data.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm sm:min-h-9" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>{s.title}</a>
          ))}
        </nav>
      </header>

      {data.sections.map((s) => (
        <RangeProvider key={s.id} initial="All">
          <section id={s.id} className="scroll-mt-28 space-y-5 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
              {s.blocks.some((b) => b.type === "chart") ? <TsRange spanYears={30} /> : null}
            </div>
            {s.id === "years" ? s.blocks.map((b, i) => (b.type === "table" ? <YearBars key={`y${i}`} t={b.table} /> : null)) : null}
            {s.blocks.map((b, i) =>
              b.type === "chart" ? (
                <LazyMount key={b.id}><TsChart id={b.id} /></LazyMount>
              ) : b.table.rows.length ? (
                <SimpleTable key={i} t={b.table} />
              ) : null,
            )}
          </section>
        </RangeProvider>
      ))}

      <footer className="border-t pt-4 text-xs" style={{ ...ink3, borderColor: "var(--rule)" }}>
        Data: NSE Indices (total-return and price indices, P/E, P/B, dividend yield, constituents, factsheets), AMFI and NSE for ETFs. Compiled and published by <a className="underline" href={`https://tipsheet.markets/indices/${slug}/`}>tipsheet.markets</a>; NSE Indices is the source of the underlying figures. Before any fund cost or tax. Descriptive data, not investment advice.
      </footer>
    </div>
  );
}
