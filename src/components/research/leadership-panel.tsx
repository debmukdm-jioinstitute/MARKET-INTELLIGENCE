"use client";

import { Panel } from "@/components/layout/page-header";
import useSWR from "swr";
import type { Leadership } from "@/lib/research/company-leadership";

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadLeadership(url: string): Promise<Leadership> {
  const res = await fetch(url);
  const json = (await res.json()) as Leadership & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const crore = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(n >= 1e9 ? 0 : 1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`);
const count = (n: number) => n.toLocaleString("en-IN");

function Bar({ label, value, max, text, tone = "bg-primary" }: { label: string; value: number; max: number; text: string; tone?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[14rem_1fr_auto]">
      <span className="truncate text-muted-foreground" title={label}>{label}</span>
      <div className="h-3 overflow-hidden rounded bg-muted"><div className={`h-full rounded ${tone}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div>
      <span className="tabular-nums font-medium">{text}</span>
    </div>
  );
}

export function LeadershipPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<Leadership>(`/api/research/leadership?symbol=${encodeURIComponent(symbol)}`, loadLeadership, { revalidateOnFocus: false });
  const payMax = Math.max(0, ...(data?.pay?.rows.map((r) => Math.max(r.maleMedian ?? 0, r.femaleMedian ?? 0)) ?? [0]));
  const divMax = Math.max(0, ...(data?.dividends?.byYear.map((y) => y.perShare) ?? [0]));
  const holdMax = Math.max(0, ...(data?.holdings?.rows.map((r) => r.shares) ?? [0]));
  const empty = data && !data.people.length && !data.pay && !data.holdings && !data.dividends;

  return (
    <Panel id="leadership" title="Leadership, pay and ownership" subtitle="Who built and runs the company, what they are paid versus employees, how much they own and what dividends flow to them.">
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

          {data.pay ? (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Median pay by group ({data.pay.fy}, company-reported)</h3>
              <div className="space-y-2">
                {data.pay.rows.map((r) => {
                  const v = Math.max(r.maleMedian ?? 0, r.femaleMedian ?? 0);
                  return v ? <Bar key={r.category} label={`${r.category} (${count((r.maleCount ?? 0) + (r.femaleCount ?? 0))})`} value={v} max={payMax} text={crore(v)} tone={r.category.startsWith("Employees") ? "bg-emerald-500" : r.category === "Workers" ? "bg-sky-500" : "bg-primary"} /> : null;
                })}
              </div>
              {data.pay.ratios.length ? (
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {data.pay.ratios.map((x) => <li key={x.label} className="rounded-md bg-muted px-2 py-1"><span className="font-semibold text-foreground">{x.times.toLocaleString("en-IN")}×</span> {x.label}</li>)}
                </ul>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">Source: <a className="text-primary hover:underline" href={data.pay.sourceUrl} target="_blank" rel="noopener noreferrer">Business Responsibility &amp; Sustainability Report (NSE)</a>. Excludes commission and sitting fees for non-executive directors; counts in brackets.</p>
            </section>
          ) : null}

          {data.holdings ? (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Shares held and dividend income (last 12 months)</h3>
              <div className="space-y-2">
                {data.holdings.rows.map((r) => <Bar key={r.label} label={r.label} value={r.shares} max={holdMax} text={`${count(r.shares)} · ${r.pctOfTotal ?? "?"}%${r.dividendIncomeTtm ? ` · ≈${crore(r.dividendIncomeTtm)}` : ""}`} tone="bg-amber-500" />)}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Share counts from the latest <a className="text-primary hover:underline" href={data.holdings.sourceUrl} target="_blank" rel="noopener noreferrer">shareholding filing (NSE XBRL)</a>{data.holdings.asOf ? `, ${data.holdings.asOf}` : ""}. Dividend income is derived: shares × dividends per share paid in the last 12 months, before tax.</p>
            </section>
          ) : null}

          {data.dividends?.byYear.length ? (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Dividend per share by financial year{data.dividends.ttmPerShare ? ` · last 12 months ₹${data.dividends.ttmPerShare}` : ""}</h3>
              <div className="space-y-2">{data.dividends.byYear.map((y) => <Bar key={y.fy} label={y.fy} value={y.perShare} max={divMax} text={`₹${Math.round(y.perShare * 100) / 100}`} tone="bg-violet-500" />)}</div>
              <p className="mt-2 text-sm text-muted-foreground">Source: NSE corporate actions (ex-dates).</p>
            </section>
          ) : null}

          <div className="space-y-1 text-sm text-muted-foreground">
            {data.annualReportUrl ? <p><a className="text-primary hover:underline" href={data.annualReportUrl} target="_blank" rel="noopener noreferrer">Open the latest annual report ↗</a> for named executive pay and individual holdings.</p> : null}
            {data.notes.map((n) => <p key={n}>{n}</p>)}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
