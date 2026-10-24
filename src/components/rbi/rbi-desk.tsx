"use client";

import { RangeProvider } from "@/components/ts-charts/range-context";
import { TsChart } from "@/components/ts-charts/ts-chart";
import { TsRange } from "@/components/ts-charts/ts-range";
import { useChartData } from "@/components/ts-charts/use-chart-data";
import { LazyMount } from "@/components/ts-charts/lazy-mount";
import { fmtVal } from "@/lib/ts-charts/format";
import type { RbiTable } from "@/lib/ts-charts/tipsheet-rbi";
import { cn } from "@/lib/utils";
import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";

const ink3 = { color: "var(--ink-3)" } as const;
const loadTables = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

/** Latest reading, the same month a year earlier, and where it sits against its own history. */
function Kpi({ id, label }: { id: string; label: string }) {
  const { data } = useChartData(id);
  if (!data?.rows.length) return <div className="h-24 animate-pulse rounded-xl" style={{ background: "var(--paper-2)" }} />;
  const col = data.series[0].col;
  const pts = data.rows.filter((r) => r[col] != null) as { date: string; [k: string]: number | string }[];
  const last = pts.at(-1)!;
  const v = last[col] as number;
  const y = new Date(last.date);
  y.setFullYear(y.getFullYear() - 1);
  const ago = [...pts].reverse().find((r) => r.date <= y.toISOString().slice(0, 10));
  const pct = Math.round((pts.filter((r) => (r[col] as number) < v).length / pts.length) * 100);
  const pos = data.band ? (v > data.band[1] ? "above its usual range" : v < data.band[0] ? "below its usual range" : "inside its usual range") : null;
  const f = (n: number) => fmtVal(n, data.fmt, data.digits);
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--rule)" }}>
      <p className="text-sm" style={ink3}>{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{f(v)}</p>
      <p className="mt-1 text-sm" style={ink3}>
        {last.date}{ago ? <>, a year ago {f(ago[col] as number)}</> : null}
      </p>
      <p className="mt-1 text-xs" style={ink3}>{pos}{pos ? ". " : ""}Higher than {pct}% of readings in this series.</p>
    </div>
  );
}

function Chart({ id, read }: { id: string; read: string }) {
  return (
    <div className="space-y-1">
      <LazyMount><TsChart id={id} /></LazyMount>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}><b>How to read it.</b> {read}</p>
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <RangeProvider initial="All">
      <section id={id} className="scroll-mt-28 space-y-5 border-t pt-6" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{intro}</p>
          </div>
          <TsRange spanYears={30} />
        </div>
        {children}
      </section>
    </RangeProvider>
  );
}

function DataTable({ t, caption, sortable = false, firstLeft = true }: { t?: RbiTable; caption: string; sortable?: boolean; firstLeft?: boolean }) {
  const [sort, setSort] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const num = (s: string) => parseFloat(s.replace(/[^\d.\-−]/g, "").replace("−", "-"));
  const rows = useMemo(() => {
    if (!t || !sort) return t?.rows ?? [];
    const { i, dir } = sort;
    return [...t.rows].sort((a, b) => {
      const x = num(a[i]), y = num(b[i]);
      return (Number.isNaN(x) || Number.isNaN(y) ? a[i].localeCompare(b[i]) : x - y) * dir;
    });
  }, [t, sort]);
  if (!t) return <div className="h-40 animate-pulse rounded-xl" style={{ background: "var(--paper-2)" }} />;
  return (
    <div>
      <p className="mb-2 text-sm" style={ink3}>{caption}</p>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--rule)" }}>
        <table className="w-full min-w-[560px] border-collapse text-sm tabular-nums">
          <thead style={ink3}>
            <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
              {t.headers.map((h, i) => (
                <th key={h} scope="col" aria-sort={sort?.i === i ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={cn("whitespace-nowrap px-3 py-2 font-medium", i === 0 && firstLeft ? "text-left" : "text-right")}>
                  {sortable ? (
                    <button type="button" className="min-h-8 touch-manipulation" onClick={() => setSort((s) => ({ i, dir: s?.i === i ? (-s.dir as 1 | -1) : i === 0 ? 1 : -1 }))}>
                      {h}{sort?.i === i ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                    </button>
                  ) : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.join("|")} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                {r.map((c, i) => <td key={i} className={cn("px-3 py-2", i === 0 && firstLeft ? "text-left" : "text-right", r[0].startsWith("of which") && i === 0 && "pl-6")}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SECTIONS = [
  ["rbi-policy", "The policy rate"],
  ["rbi-liquidity", "Cash in the system"],
  ["rbi-transmission", "Reaching borrowers and savers"],
  ["rbi-money-credit", "Money and credit"],
  ["rbi-borrowing", "What governments pay to borrow"],
  ["rbi-external", "Reserves and the rupee"],
] as const;

/** Long-form RBI desk: policy rate, MPC, liquidity, pass-through, money and credit, government borrowing, reserves. */
export default function RbiDesk() {
  const { data: tables } = useSWR<Record<"mpc" | "passthrough" | "credit" | "gsec" | "sdl", RbiTable>>("/api/rbi/tables", loadTables, { revalidateOnFocus: false });
  const asOf = (t?: RbiTable) => t?.rows[0]?.[0];
  return (
    <div className="mt-10 space-y-8" style={{ color: "var(--ink)" }}>
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">How tight is the RBI keeping money?</h2>
        <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--ink-2)" }}>
          Policy rate, the MPC, cash in the banking system, loan and deposit pass-through, money and credit, government borrowing, reserves and the rupee. Every chart has a range selector, a table view, CSV and image download.
        </p>
        <nav aria-label="On this page" className="mt-3 flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm sm:min-h-9" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>{label}</a>
          ))}
        </nav>
      </header>

      <Section id="rbi-policy" title="The policy rate" intro="The Monetary Policy Committee sets the repo rate, the rate at which the RBI lends overnight to banks. The cash reserve ratio is a second lever.">
        <div className="grid gap-4 md:grid-cols-2">
          <Kpi id="tsr.repo" label="RBI repo rate" />
          <Kpi id="tsr.real_repo" label="Real repo rate (repo minus CPI inflation)" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart id="tsr.repo" read="Every other rupee rate takes its cue from this one, with a lag. Read it beside inflation: the same repo rate is tight when inflation is low and loose when it is high." />
          <Chart id="tsr.real_repo" read="Positive means policy is tight after inflation; negative means money is cheap in real terms." />
        </div>
        <Chart id="tsr.crr_slr" read="The CRR is cash banks must hold at the RBI; the SLR is the share of deposits they must keep in government securities. A lower CRR frees cash for banks to lend." />
        <DataTable t={tables?.mpc} sortable caption={`Every MPC decision, newest first. Latest ${asOf(tables?.mpc) ?? ""}. Change in basis points; a 5–1 vote means one member voted against.`} />
      </Section>

      <Section id="rbi-liquidity" title="Cash in the system" intro="The repo rate is a target. Whether overnight money trades there depends on how much cash banks have, and the RBI adds or drains cash through its auctions.">
        <div className="grid gap-4 md:grid-cols-2"><Kpi id="tsr.call_gap" label="Call rate minus repo rate" /></div>
        <Chart id="tsr.call_gap" read="Below zero, banks have more cash than they need and overnight money trades under the repo rate. Above zero, cash is short. The call rate normally stays between the floor (SDF) and ceiling (MSF) of the corridor." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart id="tsr.call_daily" read="The weighted average call rate on each trading day against the repo rate." />
          <Chart id="tsr.laf" read="Above zero, the RBI lent cash to banks in repo auctions; below zero, it took cash back in reverse repo auctions. Standing facilities are left out." />
        </div>
      </Section>

      <Section id="rbi-transmission" title="Reaching borrowers and savers" intro="A repo cut matters only when banks pass it on. New loans and deposits reprice first; loans and deposits already on the books follow slowly.">
        <div className="grid gap-4 md:grid-cols-2"><Kpi id="tsr.walr" label="Rate on new bank loans" /></div>
        <DataTable t={tables?.passthrough} caption="Since the cuts began: from the month before the first cut to the latest month. Scheduled commercial banks." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart id="tsr.walr" read="Watch the gap between the repo rate and the rate on new loans: it shows how much of each cut reaches borrowers." />
          <Chart id="tsr.wadtdr" read="Deposit rates follow the repo rate too, often by more than loan rates." />
        </div>
      </Section>

      <Section id="rbi-money-credit" title="Money and credit" intro="Broad money (M3) grows as banks lend and take deposits. Bank credit shows where the money is going.">
        <div className="grid gap-4 md:grid-cols-2">
          <Kpi id="tsr.m3" label="Money supply (M3) growth" />
          <Kpi id="tsr.credit" label="Bank lending to individuals, growth" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart id="tsr.m3" read="Fortnightly M3 growth, year on year. Merger-inclusive from July 2023 (HDFC with HDFC Bank)." />
          <Chart id="tsr.credit" read="When personal loans grow faster than industry loans, bank credit is leaning towards households." />
        </div>
        <DataTable t={tables?.credit} caption="Bank credit by sector: non-food credit of scheduled commercial banks, outstanding in ₹ lakh crore and growth year on year." />
      </Section>

      <Section id="rbi-borrowing" title="What governments pay to borrow" intro="The centre borrows through treasury bills and dated securities, the states through state development loans (SDLs). The cut-off is the highest yield the RBI accepts at its auctions.">
        <Chart id="tsr.tbill" read="Bills track the repo rate closely. The gap between the 91-day and 364-day lines is what lenders ask for tying money up for a year instead of three months." />
        <DataTable t={tables?.gsec} caption={`Recent dated-securities auctions, latest ${asOf(tables?.gsec) ?? ""}. Bid cover is bids over amount offered; devolvement is what primary dealers had to take up.`} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart id="tsr.sdl_cutoff" read="Weekly SDL cut-off weighted by amount sold. A week of long-dated issues clears higher than a week of short ones." />
          <Chart id="tsr.sdl_years" read="Average years to maturity of the SDLs sold each week; longer paper usually clears at a higher yield." />
        </div>
        <DataTable t={tables?.sdl} sortable caption="Borrowing by state: SDLs sold in FY27 so far and in FY26, with the cut-off weighted by amount. Click a column to sort." />
      </Section>

      <Section id="rbi-external" title="Reserves and the rupee" intro="The RBI buys dollars when money flows in and sells them when it flows out, to slow the rupee's moves.">
        <div className="grid gap-4 md:grid-cols-2">
          <Kpi id="tsr.reserves" label="Foreign exchange reserves, US$ billion" />
          <Kpi id="tsr.import_cover" label="Import cover, months" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart id="tsr.reserves" read="Reserves rise when the RBI buys dollars and when holdings gain in dollar terms, gold included. A fall is not always intervention: a stronger dollar shrinks the other currencies held." />
          <Chart id="tsr.fx" read="Above zero, the RBI bought dollars, resisting a rising rupee; below zero, it sold dollars to support it. Published about two months late." />
          <Chart id="tsr.bop" read="Below zero, India buys more from the world than it sells, net of remittances and income, and needs capital inflows to pay for it. The balance-of-payments table lags." />
          <Chart id="tsr.reer" read="Trade-weighted index against 40 currencies. The real index allows for India's higher inflation; above 100, the rupee is dearer in real terms than in 2015-16." />
        </div>
      </Section>

      <footer className="space-y-1 border-t pt-4 text-xs" style={{ ...ink3, borderColor: "var(--rule)" }}>
        <p>Data: Reserve Bank of India (Weekly Statistical Supplement, Database on Indian Economy, Handbook of Statistics, Bulletin, MPC resolutions, auction results), CCIL money-market rates, CPI from MoSPI. Series compiled and published as open data by <a className="underline" href="https://tipsheet.markets/methods/rbi/">tipsheet.markets</a>; the RBI is the source of the underlying figures. Updated hourly from the published files.</p>
        <p>Usual range = 10th to 90th percentile of the series history. Descriptive data, not investment advice.</p>
      </footer>
    </div>
  );
}
