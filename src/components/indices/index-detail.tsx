"use client";

import { LazyMount } from "@/components/ts-charts/lazy-mount";
import { RangeProvider } from "@/components/ts-charts/range-context";
import { TsChart } from "@/components/ts-charts/ts-chart";
import { TsRange } from "@/components/ts-charts/ts-range";
import type { IndexPage, TableOut } from "@/lib/indices/tipsheet-indices";
import Link from "next/link";
import { useEffect, useState } from "react";
import { dmy } from "@/lib/format";
import { IndexOverview } from "./index-overview";
import { OutcomesTable, SipTable } from "./outcomes";
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

const TAB: Record<string, string> = { returns: "Returns", years: "Year by year", falls: "The falls", outcomes: "Holding outcomes", risk: "Risk", valuation: "Valuation", inside: "Holdings", against: "Versus Nifty 50", use: "Models & ETFs" };
const asOfDmy = (s: string) => dmy(s.replace(/^(\d{1,2}) (\w+) (\d{4})$/, "$1 $2 $3"));

function Num({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight"><span style={ink3} className="font-normal">{n} /</span> {title}</h2>
      {sub ? <p className="mt-1 text-sm" style={ink3}>{dmy(sub)}</p> : null}
    </div>
  );
}

/** One NSE index: overview, then tabbed sections (returns, years, falls, holding outcomes, risk, valuation, holdings, versus the Nifty, models and ETFs). */
export default function IndexDetail({ slug }: { slug: string }) {
  const { data, error } = useSWR<IndexPage>(`/api/indices/tipsheet?slug=${slug}`, load, { revalidateOnFocus: false });
  const [tab, setTab] = useState<string | null>(null);
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h) setTab(h);
  }, []);
  if (error) return <p className="py-10 text-center text-sm" style={ink3}>This index is unavailable right now. <Link className="underline" href="/markets?section=india">Back to all indices</Link></p>;
  if (!data) return <p className="py-10 text-center text-sm" style={ink3} aria-busy>Loading index…</p>;
  const active = data.sections.find((x) => x.id === tab) ?? data.sections[0];
  const short = data.title.replace(/^Nifty /, "");
  return (
    <div className="space-y-8 pb-12" style={{ color: "var(--ink)" }}>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm" style={{ ...ink3, borderColor: "var(--ink)" }}>
          <nav aria-label="Breadcrumb"><Link href="/markets" className="underline-offset-4 hover:underline">Markets</Link> / <Link href="/markets?section=india" className="underline-offset-4 hover:underline">Indices</Link> / {short}</nav>
          <span>Data to {asOfDmy(data.asOf)}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{data.title}</h1>
        <p className="text-base sm:text-lg" style={ink3}>NSE index · Total returns with dividends reinvested</p>
      </header>

      <IndexOverview kpis={data.kpis} asOf={data.asOf} />

      <nav aria-label="Sections" role="tablist" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1" style={{ borderColor: "var(--rule)" }}>
        {data.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active.id === s.id}
            onClick={() => { setTab(s.id); history.replaceState(null, "", `#${s.id}`); }}
            className="min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3.5 text-sm sm:text-base"
            style={{ borderColor: active.id === s.id ? "var(--ink)" : "transparent", color: active.id === s.id ? "var(--ink)" : "var(--ink-3)", fontWeight: active.id === s.id ? 600 : 400 }}
          >
            {TAB[s.id] ?? s.title}
          </button>
        ))}
      </nav>

      <RangeProvider key={active.id} initial="All">
        <section id={active.id} role="tabpanel" className="space-y-5">
          {active.id === "outcomes" ? <OutcomesSection s={active} /> : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Num n="01" title={active.title} />
                {active.blocks.some((b) => b.type === "chart") ? <TsRange spanYears={30} /> : null}
              </div>
              {active.id === "years" ? active.blocks.map((b, i) => (b.type === "table" ? <YearBars key={`y${i}`} t={b.table} /> : null)) : null}
              {active.blocks.map((b, i) =>
                b.type === "chart" ? (
                  <LazyMount key={b.id}><TsChart id={b.id} /></LazyMount>
                ) : b.table.rows.length ? (
                  <SimpleTable key={i} t={b.table} />
                ) : null,
              )}
            </>
          )}
        </section>
      </RangeProvider>

      <footer className="flex flex-wrap items-start justify-between gap-2 border-t pt-4 text-xs" style={{ ...ink3, borderColor: "var(--rule)" }}>
        <p>Index returns before fund costs and tax. Historical outcomes are not a forecast. Figures before launch use NSE's back-calculated history.<br />Source: NSE Indices · Compiled by <a className="underline" href={`https://tipsheet.markets/indices/${slug}/`}>tipsheet.markets</a> · Displayed on Market Intelligence. Descriptive data, not investment advice.</p>
      </footer>
    </div>
  );
}

function OutcomesSection({ s }: { s: IndexPage["sections"][number] }) {
  const tables = s.blocks.filter((b): b is Extract<typeof b, { type: "table" }> => b.type === "table");
  const chart = s.blocks.find((b) => b.type === "chart");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Num n="01" title="Holding-period outcomes" sub="Annualised total returns, including reinvested dividends." />
        {chart ? <TsRange spanYears={30} /> : null}
      </div>
      {tables[0]?.table.rows.length ? <OutcomesTable t={tables[0].table} /> : null}
      {chart && chart.type === "chart" ? <LazyMount><TsChart id={chart.id} /></LazyMount> : null}
      {tables[1]?.table.rows.length ? (
        <>
          <Num n="02" title="₹10,000 invested every month" />
          <SipTable t={tables[1].table} />
        </>
      ) : null}
    </>
  );
}
