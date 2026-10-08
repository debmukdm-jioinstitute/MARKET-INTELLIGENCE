"use client";

import { Panel } from "@/components/layout/page-header";
import useSWR from "swr";
import type { Leadership } from "@/lib/research/company-leadership";
import { cn } from "@/lib/utils";
import { BarChart3, ChevronDown, Info, ListOrdered, Users } from "lucide-react";
import { useState } from "react";

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadLeadership(url: string): Promise<Leadership> {
  const res = await fetch(url);
  const json = (await res.json()) as Leadership & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const crore = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(n >= 1e9 ? 0 : 1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`);
const count = (n: number) => n.toLocaleString("en-IN");
const leadershipRefreshInterval = (data?: Leadership) => data?.refreshing ? 2000 : 0;

/** 10.50 -> "10.5", 23 -> "23", 18.15 -> "18.15". */
const trimNum = (n: number) => String(Math.round(n * 100) / 100);

const fmtShares = (n: number) => n.toLocaleString("en-IN");
const fmtPct = (p: number | null) => (p == null ? "—" : `${trimNum(p)}%`);
/** Matches the reference design: ≈ ₹1,388 Cr / ≈ ₹10.5 L / ≈ ₹38,913. */
const fmtDivIncome = (n: number | null) =>
  n == null ? "—" : n >= 1e7 ? `≈ ₹${trimNum(n / 1e7)} Cr` : n >= 1e5 ? `≈ ₹${trimNum(n / 1e5)} L` : `≈ ₹${Math.round(n).toLocaleString("en-IN")}`;

function Bar({ label, value, max, text, tone = "bg-primary" }: { label: string; value: number; max: number; text: string; tone?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[14rem_1fr_auto]">
      <span className="truncate text-muted-foreground" title={label}>{label}</span>
      <div className="h-3 overflow-hidden rounded bg-muted"><div className={`h-full rounded ${tone}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div>
      <span className="tabular-nums font-medium">{text}</span>
    </div>
  );
}

function FySelect({ fys, value, onChange }: { fys: string[]; value: string; onChange: (fy: string) => void }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Financial year</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-border bg-card py-1.5 pl-3 pr-8 text-sm font-medium text-foreground touch-manipulation"
      >
        {fys.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" aria-hidden />
    </label>
  );
}

function OwnershipCard({ holdings }: { holdings: NonNullable<Leadership["holdings"]> }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-heading text-base font-bold text-foreground">Ownership &amp; dividend income</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Shareholding and estimated dividend income in the last 12 months (NSE XBRL{holdings.asOf ? `, ${holdings.asOf}` : ""}).
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 text-left font-medium">Holder group</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Shares held</th>
              <th scope="col" className="w-[190px] px-3"><span className="sr-only">Ownership bar</span></th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Ownership %</th>
              <th scope="col" className="py-2 text-right font-medium">
                <span className="inline-flex items-center justify-end gap-1">Dividend income (LTM) <Info className="size-3.5" aria-hidden /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.rows.map((r) => (
              <tr key={r.label} className="border-t border-border/60">
                <td className="py-2.5 pr-3 font-medium text-foreground">{r.label}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{fmtShares(r.shares)}</td>
                <td className="px-3" aria-hidden>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(1.5, Math.min(100, r.pctOfTotal ?? 0))}%` }} />
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{fmtPct(r.pctOfTotal)}</td>
                <td className="py-2.5 text-right tabular-nums text-foreground">{fmtDivIncome(r.dividendIncomeTtm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Catmull-Rom -> cubic Bezier smooth path through the points. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function DividendChart({ years, selectedFy }: { years: { fy: string; perShare: number }[]; selectedFy: string }) {
  const W = 680, H = 300, PL = 40, PR = 14, PT = 30, PB = 38;
  const maxV = Math.max(...years.map((y) => y.perShare), 1);
  const step = Math.pow(10, Math.floor(Math.log10(maxV)));
  const yMax = Math.ceil(maxV / step) * step;
  const x = (i: number) => PL + (years.length === 1 ? 0.5 : i / (years.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / yMax) * (H - PT - PB);
  const pts = years.map((d, i) => [x(i), y(d.perShare)] as const);
  const line = smoothPath(pts);
  const area = years.length > 1 ? `${line} L ${x(years.length - 1)},${y(0)} L ${x(0)},${y(0)} Z` : "";
  const ticks = Array.from({ length: Math.min(5, yMax / step + 1) }, (_, i) => (yMax / Math.max(1, Math.min(4, Math.round(yMax / step)))) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Dividend per share by financial year, ${years.map((d) => `${d.fy} ₹${trimNum(d.perShare)}`).join(", ")}`} className="h-auto w-full">
      <defs>
        <linearGradient id="div-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth="1" />
          <text x={PL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-muted-foreground">{trimNum(t)}</text>
        </g>
      ))}
      <text x={14} y={H / 2} textAnchor="middle" fontSize="11" className="fill-muted-foreground" transform={`rotate(-90 14 ${H / 2})`}>Dividend per share (₹)</text>
      {area ? <path d={area} fill="url(#div-area)" /> : null}
      {line ? <path d={line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" /> : null}
      {years.map((d, i) => {
        const sel = d.fy === selectedFy;
        return (
          <g key={d.fy}>
            {sel ? <line x1={x(i)} x2={x(i)} y1={y(d.perShare)} y2={H - PB} stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" /> : null}
            <text x={x(i)} y={y(d.perShare) - 12} textAnchor="middle" fontSize="12" fontWeight={sel ? 700 : 500} fill={sel ? "#1d4ed8" : "#374151"} className="dark:fill-zinc-200">₹{trimNum(d.perShare)}</text>
            {sel ? <circle cx={x(i)} cy={y(d.perShare)} r="9" fill="#fff" stroke="#2563eb" strokeWidth="3" /> : null}
            <circle cx={x(i)} cy={y(d.perShare)} r={sel ? 4 : 4.5} fill="#2563eb" stroke="#fff" strokeWidth="1.5">
              <title>{d.fy}: ₹{trimNum(d.perShare)}</title>
            </circle>
            {sel ? (
              <g>
                <rect x={x(i) - 26} y={H - PB + 6} width="52" height="20" rx="6" fill="#dbeafe" className="dark:fill-blue-950" />
                <text x={x(i)} y={H - PB + 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1d4ed8" className="dark:fill-blue-300">{d.fy}</text>
              </g>
            ) : (
              <text x={x(i)} y={H - PB + 20} textAnchor="middle" fontSize="12" className="fill-muted-foreground">{d.fy}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DividendCard({
  dividends,
  selectedFy,
}: {
  dividends: NonNullable<Leadership["dividends"]>;
  selectedFy: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const years = dividends.byYear;
  const selIdx = Math.max(0, years.findIndex((y) => y.fy === selectedFy));
  const sel = years[selIdx]!;
  const prev = selIdx > 0 ? years[selIdx - 1]! : null;
  const chgPct = prev && prev.perShare ? ((sel.perShare - prev.perShare) / prev.perShare) * 100 : null;
  const hi = years.reduce((a, b) => (b.perShare > a.perShare ? b : a), years[0]!);
  const lo = years.reduce((a, b) => (b.perShare < a.perShare ? b : a), years[0]!);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">Dividend per share</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Dividend per share by financial year{dividends.ttmPerShare != null ? ` · Last 12 months ₹${trimNum(dividends.ttmPerShare)}` : ""}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border p-0.5 text-sm" role="tablist" aria-label="Dividend view">
          {(
            [
              { id: "chart", label: "Chart view", Icon: BarChart3 },
              { id: "table", label: "Table view", Icon: ListOrdered },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors touch-manipulation",
                view === id ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          {view === "chart" ? (
            <DividendChart years={years} selectedFy={sel.fy} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 text-left font-medium">Financial year</th>
                    <th scope="col" className="py-2 text-right font-medium">Dividend per share</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((d) => (
                    <tr key={d.fy} className={cn("border-t border-border/60", d.fy === sel.fy && "bg-blue-50/60 dark:bg-blue-950/40")}>
                      <td className="py-2 pr-3 font-medium text-foreground">{d.fy}</td>
                      <td className="py-2 text-right tabular-nums text-foreground">₹{trimNum(d.perShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl bg-muted/60 p-4 dark:bg-muted/30" aria-label="Dividend summary">
          <p className="text-sm text-muted-foreground">Dividend per share</p>
          <p className="text-xs text-muted-foreground">{sel.fy}</p>
          <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-foreground">₹{trimNum(sel.perShare)}</p>
          {chgPct != null && prev ? (
            <p className={cn("mt-1 text-sm font-medium tabular-nums", chgPct < 0 ? "text-rose-600" : "text-emerald-600")}>
              {chgPct < 0 ? "▼" : "▲"} {trimNum(Math.abs(chgPct))}% <span className="font-normal text-muted-foreground">vs {prev.fy} (₹{trimNum(prev.perShare)})</span>
            </p>
          ) : null}
          <dl className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Highest ({hi.fy})</dt>
              <dd className="font-medium tabular-nums text-foreground">₹{trimNum(hi.perShare)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Lowest ({lo.fy})</dt>
              <dd className="font-medium tabular-nums text-foreground">₹{trimNum(lo.perShare)}</dd>
            </div>
            {dividends.ttmPerShare != null ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Last 12 months</dt>
                <dd className="font-medium tabular-nums text-foreground">₹{trimNum(dividends.ttmPerShare)}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-border/60 pt-2.5">
        <p className="text-xs text-muted-foreground">Source: NSE corporate actions (ex-dates).</p>
        <p className="text-xs text-muted-foreground">Dividend income is derived: shares × dividends per share paid in the last 12 months, before tax.</p>
      </div>
    </section>
  );
}

export function LeadershipPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<Leadership>(`/api/research/leadership?symbol=${encodeURIComponent(symbol)}`, loadLeadership, { revalidateOnFocus: false, refreshInterval: leadershipRefreshInterval });
  const payMax = Math.max(0, ...(data?.pay?.rows.map((r) => Math.max(r.maleMedian ?? 0, r.femaleMedian ?? 0)) ?? [0]));
  const empty = data && !data.people.length && !data.pay && !data.holdings && !data.dividends;

  const fys = data?.dividends?.byYear.map((y) => y.fy) ?? [];
  const [fySel, setFySel] = useState<string | null>(null);
  const selFy = (fySel && fys.includes(fySel) ? fySel : fys[fys.length - 1]) ?? null;

  return (
    <Panel
      id="leadership"
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-400" aria-hidden>
            <Users className="size-5" />
          </span>
          Leadership, pay and ownership
        </span>
      }
      subtitle="Who built and runs the company, what they are paid versus employees, how much they own and what dividends flow to them."
      action={fys.length > 1 && selFy ? <FySelect fys={fys} value={selFy} onChange={setFySel} /> : null}
    >
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Reading filings for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load leadership data right now. Try again in a moment.</p> : null}
      {empty ? <p className="text-sm text-muted-foreground">No leadership or pay data was found in the free public sources checked. This does not mean none exists.</p> : null}
      {data ? (
        <div className="space-y-6">
          {data.people.length ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Founders and leadership</h3>
              <ul className="flex flex-wrap gap-3">
                {data.people.map((p) => (
                  <li key={`${p.role}-${p.name}`}>
                    <a href={p.profileUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 pr-3 hover:bg-muted">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                      ) : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">{p.name.slice(0, 1)}</span>}
                      <span className="text-sm"><span className="block font-medium text-primary">{p.name} ↗</span><span className="text-sm text-muted-foreground">{p.role}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.pay?.status === "ok" ? (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Median pay by group ({data.pay.fy}, company-reported)</h3>
              <p className="mb-2 text-xs text-muted-foreground">{data.pay.fy}{data.pay.filingDate ? `, filed ${data.pay.filingDate}` : ", filing date not supplied"}{data.pay.extractedBy === "model" ? " · machine-read" : ""}. Last checked {data.pay.updatedAt.slice(0, 10)}.</p>
              {data.pay.latestAttempt ? <p className="mb-2 text-xs text-amber-700">Showing {data.pay.fy}. {data.pay.latestAttempt.status === "not_filed" ? `No ${data.pay.latestAttempt.fy} BRSR filing was listed.` : `The newer ${data.pay.latestAttempt.fy} pay table could not be read.`}{data.pay.latestAttempt.sourceUrl ? <> <a href={data.pay.latestAttempt.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Open the newer filing</a></> : null}</p> : null}
              <div className="space-y-2">
                {data.pay.rows.map((r) => {
                  const v = Math.max(r.maleMedian ?? 0, r.femaleMedian ?? 0);
                  return v ? <Bar key={r.category} label={`${r.category} (male ${r.maleCount === null ? "not reported" : count(r.maleCount)}, female ${r.femaleCount === null ? "not reported" : count(r.femaleCount)})`} value={v} max={payMax} text={crore(v)} tone={r.category.startsWith("Employees") ? "bg-emerald-500" : r.category === "Workers" ? "bg-sky-500" : "bg-primary"} /> : null;
                })}
              </div>
              {data.pay.ratios.length ? (
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {data.pay.ratios.map((x) => <li key={x.label} className="rounded-md bg-muted px-2 py-1"><span className="font-semibold text-foreground">{x.times.toLocaleString("en-IN")}×</span> {x.label}</li>)}
                </ul>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">Source: <a className="text-primary hover:underline" href={data.pay.sourceUrl ?? undefined} target="_blank" rel="noopener noreferrer">Business Responsibility &amp; Sustainability Report (NSE)</a>. Bars show the higher reported male or female median, with reported counts in brackets. Multiples use the male employee median when available, otherwise the female median. Directors' figures may include commission or sitting fees as reported.</p>
            </section>
          ) : null}

          {data.pay && data.pay.status !== "ok" ? (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Median pay by group</h3>
              <p className="text-sm text-muted-foreground">{data.pay.status === "not_filed" ? "No BRSR filing was listed in the sources checked for this company." : "Pay table could not be read from this company's filing."}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.pay.fy}{data.pay.filingDate ? `, filed ${data.pay.filingDate}` : ""}{data.pay.sourceUrl ? <> · <a href={data.pay.sourceUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open filing ↗</a></> : null}</p>
            </section>
          ) : null}

          {data.holdings ? <OwnershipCard holdings={data.holdings} /> : null}

          {data.dividends?.byYear.length && selFy ? <DividendCard dividends={data.dividends} selectedFy={selFy} /> : null}

          <div className="space-y-1 text-sm text-muted-foreground">
            {data.annualReportUrl ? <p><a className="text-primary hover:underline" href={data.annualReportUrl} target="_blank" rel="noopener noreferrer">Open the latest annual report ↗</a> for named executive pay and individual holdings.</p> : null}
            {data.notes.map((n) => <p key={n}>{n}</p>)}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
