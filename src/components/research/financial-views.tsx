"use client";

import { useState } from "react";
import { Fold, Takeaway, Tile, type Tone } from "@/components/guide/explain";
import { cn } from "@/lib/utils";
import type { FinancialRatioMetrics, StatementColumn, StatementRow, WorkingCapitalMetrics } from "@/lib/financials/types";

/** ₹ amount in crore with a proper minus sign: −₹70 cr, not ₹-70 cr. */
const money = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `${n < 0 ? "−" : ""}₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })} cr`);
const cr1 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
const x2 = (n: number | null | undefined, u = "") => (n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(2)}${u}`);
const days = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `${n < 0 ? "−" : ""}${Math.abs(Math.round(n))} days`);
const pct = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null || !(b > 0) ? null : ((a - b) / b) * 100);
const sgn = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
/** M6: never assert "Reviewed" when the filing didn't say; null = not disclosed. */
const auditLabel = (a: boolean | null | undefined) =>
  a === true ? "Audited" : a === false ? "Reviewed (unaudited)" : "Audit status not disclosed";
const auditSentence = (a: boolean | null | undefined) =>
  a === true ? "Audited" : a === false ? "Reviewed (unaudited)" : "audit status not disclosed by the filing";
/** H1: the winning filing basis, shown per column. */
const basisLabel = (b: string | null | undefined) =>
  b === "consolidated" ? "Consolidated" : b === "standalone" ? "Standalone" : "";
/** L2: never render "₹— cr". */
const moneyCr = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `₹${cr1(n)} cr`);
/** L3: per-share values use the repo's Unicode minus convention. */
const ps = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `₹${n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}`);

const findRow = (rows: StatementRow[], tags: string[]) => {
  for (const t of tags) {
    const r = rows.find((x) => x.tag === t);
    if (r && Object.values(r.values).some((v) => v != null)) return r;
  }
  return null;
};
const lastTwo = (row: StatementRow | null, cols: StatementColumn[]) => {
  if (!row) return { cur: null as number | null, prev: null as number | null, label: cols[cols.length - 1]?.label ?? "" };
  const cur = cols.length ? row.values[cols[cols.length - 1].key] ?? null : null;
  const prev = cols.length > 1 ? row.values[cols[cols.length - 2].key] ?? null : null;
  return { cur, prev, label: cols[cols.length - 1]?.label ?? "" };
};
const move = (c: number | null | undefined) => (c == null ? "" : c >= 0 ? "up" : "down");
const chgTone = (c: number | null): "text-emerald-600" | "text-rose-600" | "text-muted-foreground" => (c == null ? "text-muted-foreground" : c >= 0 ? "text-emerald-600" : "text-rose-600");

const REV_TAGS = ["RevenueFromOperations", "InterestEarned", "Income"];
const PAT_TAGS = ["ProfitLossForPeriod", "ProfitLossFromOrdinaryActivitiesAfterTax", "ProfitLossAfterTaxesMinorityInterestAndShareOfProfitLossOfAssociates"];

/** Four tiny bars: shape of the last few periods at a glance. */
function Bars({ label, values, labels, color }: { label: string; values: (number | null)[]; labels: string[]; color: string }) {
  const nums = values.filter((v): v is number => v != null);
  const max = Math.max(1, ...nums.map((v) => Math.abs(v)));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-base font-semibold">{label}</p>
      <div className="mt-3 flex h-24 items-end gap-3" role="img" aria-label={`${label} over the last ${values.length} periods`}>
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div className={cn("w-full rounded-t", v != null && v < 0 ? "bg-rose-400" : color)} style={{ height: `${v == null ? 2 : Math.max(4, (Math.abs(v) / max) * 100)}%` }} title={`${labels[i]}: ${money(v)}`} />
            <span className="text-xs text-muted-foreground">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Quarter by quarter: one verdict, three tiles, a trend, and the detailed cards folded. */
export function QuarterlyView({ quarters, plRows, ratios }: { quarters: StatementColumn[]; plRows: StatementRow[]; ratios: FinancialRatioMetrics[] }) {
  const last4 = quarters.slice(-4);
  const rev = findRow(plRows, REV_TAGS);
  const pat = findRow(plRows, PAT_TAGS);
  const val = (row: StatementRow | null, q: StatementColumn) => (row ? row.values[q.key] ?? null : null);
  if (!last4.length) return <p className="text-base text-muted-foreground">No quarterly results found yet.</p>;
  const cur = last4[last4.length - 1];
  const prev = last4.length > 1 ? last4[last4.length - 2] : null;
  const revC = pct(val(rev, cur), prev ? val(rev, prev) : null);
  const patC = pct(val(pat, cur), prev ? val(pat, prev) : null);
  const tone: Tone = revC == null && patC == null ? "info" : (revC ?? 0) >= 0 && (patC ?? 0) >= 0 ? "good" : (revC ?? 0) < 0 && (patC ?? 0) < 0 ? "bad" : "watch";
  const opm = ratios.find((r) => r.periodKey === cur.key)?.opmPct ?? null;
  const line =
    revC == null && patC == null
      ? `Results for ${cur.label}.`
      : `${cur.label}: sales ${revC == null ? "n/a" : `${move(revC)} ${Math.abs(revC).toFixed(1)}%`} and profit ${patC == null ? "n/a" : `${move(patC)} ${Math.abs(patC).toFixed(1)}%`} compared with the quarter before.`;

  return (
    <div className="space-y-5">
      <Takeaway tone={tone} sub={`${auditSentence(cur.audited)} figures filed with the exchange${basisLabel(cur.basis) ? ` (${basisLabel(cur.basis).toLowerCase()})` : ""}. Amounts in ₹ crore (1 crore = 10 million).`}>{line}</Takeaway>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Sales" value={`${money(val(rev, cur))}`} hint="Money the business earned from customers this quarter." footer={revC != null ? <span className={cn("text-sm font-medium", chgTone(revC))}>{sgn(revC)} vs last quarter</span> : null} />
        <Tile label="Profit" value={`${money(val(pat, cur))}`} hint="What is left after all costs and tax." footer={patC != null ? <span className={cn("text-sm font-medium", chgTone(patC))}>{sgn(patC)} vs last quarter</span> : null} />
        <Tile label="Profit on each ₹100 of sales" value={opm != null ? `₹${opm.toFixed(1)}` : "—"} hint="EBITDA margin: profit before interest, tax and depreciation, per ₹100 of sales." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Bars label="Sales, last quarters (₹ cr)" values={last4.map((q) => val(rev, q))} labels={last4.map((q) => q.label)} color="bg-primary/70" />
        <Bars label="Profit, last quarters (₹ cr)" values={last4.map((q) => val(pat, q))} labels={last4.map((q) => q.label)} color="bg-emerald-500/70" />
      </div>
      <Fold title="Quarter by quarter, with filings">
        <div className="grid gap-3 sm:grid-cols-2">
          {last4.map((q, i) => {
            const p = i > 0 ? last4[i - 1] : null;
            const rc = pct(val(rev, q), p ? val(rev, p) : null);
            const pc = pct(val(pat, q), p ? val(pat, p) : null);
            return (
              <div key={q.key} className="rounded-xl border border-border p-4 text-base">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{q.label}</span>
                  <span className="text-sm text-muted-foreground">{[basisLabel(q.basis), auditLabel(q.audited)].filter(Boolean).join(" · ")}</span>
                </div>
                <p className="mt-2">Sales <span className="font-semibold tabular-nums">{moneyCr(val(rev, q))}</span> {rc != null ? <span className={cn("text-sm", chgTone(rc))}>{sgn(rc)}</span> : null}</p>
                <p>Profit <span className="font-semibold tabular-nums">{moneyCr(val(pat, q))}</span> {pc != null ? <span className={cn("text-sm", chgTone(pc))}>{sgn(pc)}</span> : null}</p>
                {q.xbrlUrl ? <a href={q.xbrlUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">Official filing (XML) ↗</a> : null}
              </div>
            );
          })}
        </div>
      </Fold>
    </div>
  );
}

function StatementTable({ rows, cols, caption, onlyTotals }: { rows: StatementRow[]; cols: StatementColumn[]; caption: string; onlyTotals?: boolean }) {
  const shown = onlyTotals ? rows.filter((r) => r.kind === "total") : rows;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-left text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-muted/40 font-semibold">
            <th className="min-w-[220px] py-2.5 pl-4 pr-3">{caption} <span className="text-sm font-normal text-muted-foreground">(₹ crore)</span></th>
            {cols.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-2.5 text-right">
                <div>{c.label}</div>
                {basisLabel(c.basis) ? <div className="text-sm font-normal text-muted-foreground">{basisLabel(c.basis)}</div> : null}
                <div className="text-sm font-normal text-muted-foreground">{auditLabel(c.audited)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {shown.map((row) => (
            <tr key={row.tag} className={cn("hover:bg-muted/30", row.kind === "total" && "bg-muted/20 font-semibold")}>
              <td className={cn("py-2 pl-4 pr-3", row.kind === "total" ? "text-foreground" : "text-muted-foreground")}>{row.label}</td>
              {cols.map((c) => {
                const v = row.values[c.key];
                return (
                  <td key={c.key} className={cn("whitespace-nowrap px-3 py-2 text-right tabular-nums", v != null && v < 0 && "text-rose-600")}>
                    {row.unit === "ps" ? ps(v) : cr1(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mobile key-lines view: the two latest periods first, full history one tap away. */
function MobileKeyLines({ rows, cols, name }: { rows: StatementRow[]; cols: StatementColumn[]; name: string }) {
  const [showAll, setShowAll] = useState(false);
  const recent = cols.slice(-2);
  return (
    <div className="space-y-2">
      <StatementTable rows={rows} cols={showAll ? cols : recent} caption={`${name}: key lines`} onlyTotals />
      {cols.length > 2 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-medium text-primary active:bg-muted/50"
        >
          {showAll ? "Show latest 2 years" : `Show full history (${cols.length} years)`}
        </button>
      ) : null}
    </div>
  );
}

/** Profit & loss, balance sheet or cash flow: what it says first, key lines next, every line item folded. */
export function StatementView({ kind, rows, cols }: { kind: "pl" | "bs" | "cf"; rows: StatementRow[]; cols: StatementColumn[] }) {
  if (!cols.length || !rows.length) return <p className="text-base text-muted-foreground">No statement filed for this period type yet.</p>;
  const name = kind === "pl" ? "Profit and loss" : kind === "bs" ? "Balance sheet" : "Cash flow";
  let head: React.ReactNode = null;

  if (kind === "pl") {
    const rev = lastTwo(findRow(rows, REV_TAGS), cols);
    const pat = lastTwo(findRow(rows, PAT_TAGS), cols);
    const eps = lastTwo(findRow(rows, ["BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations"]), cols);
    const rc = pct(rev.cur, rev.prev);
    const pc = pct(pat.cur, pat.prev);
    const tone: Tone = rc == null && pc == null ? "info" : (pc ?? rc ?? 0) >= 0 ? "good" : "watch";
    head = (
      <>
        <Takeaway tone={tone} sub="Profit and loss shows what the company earned and spent over the period.">
          {rev.cur == null ? `${name}, ${rev.label}.` : `${rev.label}: sales of ${money(rev.cur)}${rc != null ? `, ${move(rc)} ${Math.abs(rc).toFixed(1)}%` : ""}, and profit of ${money(pat.cur)}${pc != null ? `, ${move(pc)} ${Math.abs(pc).toFixed(1)}%` : ""}.`}
        </Takeaway>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Sales" value={`${money(rev.cur)}`} hint="What customers paid the company." footer={rc != null ? <span className={cn("text-sm font-medium", chgTone(rc))}>{sgn(rc)} vs previous period</span> : null} />
          <Tile label="Profit" value={`${money(pat.cur)}`} hint="What is left after all costs and tax." footer={pc != null ? <span className={cn("text-sm font-medium", chgTone(pc))}>{sgn(pc)} vs previous period</span> : null} />
          <Tile label="Profit per share" value={ps(eps.cur)} hint="Profit divided by the number of shares (EPS). Higher is better." />
        </div>
      </>
    );
  } else if (kind === "bs") {
    const assets = lastTwo(findRow(rows, ["Assets", "CapitalAndLiabilities"]), cols);
    const equity = lastTwo(findRow(rows, ["Equity"]), cols);
    const b1 = findRow(rows, ["BorrowingsNoncurrent", "Borrowings"]);
    const b2 = findRow(rows, ["BorrowingsCurrent"]);
    const lastKey = cols[cols.length - 1].key;
    const debt = b1 || b2 ? (b1?.values[lastKey] ?? 0) + (b2?.values[lastKey] ?? 0) : null;
    const de = debt != null && equity.cur ? debt / equity.cur : null;
    const tone: Tone = de == null ? "info" : de < 0.5 ? "good" : de < 1.5 ? "watch" : "bad";
    head = (
      <>
        <Takeaway tone={tone} sub="The balance sheet is a snapshot: what the company owns, what it owes, and what is left for the owners.">
          {de == null ? `Balance sheet as of ${assets.label}.` : de < 0.5 ? `Low debt: it owes ${money(debt)} against ${money(equity.cur)} of owners' money.` : de < 1.5 ? `Moderate debt: it owes ${money(debt)} against ${money(equity.cur)} of owners' money.` : `Heavy debt: it owes ${money(debt)} against only ${money(equity.cur)} of owners' money.`}
        </Takeaway>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Everything it owns" value={`${money(assets.cur)}`} hint="Total assets: factories, cash, stock, money owed by customers." />
          <Tile label="Owners' money" value={`${money(equity.cur)}`} hint="What would be left for shareholders after paying every debt." />
          <Tile label="Borrowings" value={debt != null ? `${money(debt)}` : "—"} hint={de != null ? `${de.toFixed(2)}× the owners' money. Lower is safer.` : "Loans from banks and bond holders."} tone={de == null ? "info" : de < 0.5 ? "good" : de < 1.5 ? "info" : "bad"} />
        </div>
      </>
    );
  } else {
    const op = lastTwo(findRow(rows, ["CashFlowsFromUsedInOperatingActivities"]), cols);
    const inv = lastTwo(findRow(rows, ["CashFlowsFromUsedInInvestingActivities"]), cols);
    const fin = lastTwo(findRow(rows, ["CashFlowsFromUsedInFinancingActivities"]), cols);
    const tone: Tone = op.cur == null ? "info" : op.cur > 0 ? "good" : "bad";
    head = (
      <>
        <Takeaway tone={tone} sub="Cash flow tracks real money moving in and out, which can differ from reported profit.">
          {op.cur == null ? `Cash flow, ${op.label}.` : op.cur > 0 ? `${op.label}: the business itself brought in ${money(op.cur)} of cash.` : `${op.label}: the business used up ${money(Math.abs(op.cur))} of cash.`}
        </Takeaway>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="From running the business" value={`${money(op.cur)}`} hint="Positive is healthy: customers paid more than the bills." tone={op.cur == null ? "info" : op.cur > 0 ? "good" : "bad"} />
          <Tile label="Invested or spent" value={`${money(inv.cur)}`} hint="Negative usually means buying machines, property or investments for growth." />
          <Tile label="From lenders and owners" value={`${money(fin.cur)}`} hint="Positive means it raised money, negative means it repaid loans or paid dividends." />
        </div>
      </>
    );
  }

  // 5-year history: show only the years NSE actually delivered XBRL for, with an honest note.
  const annualCols = cols.filter((c) => c.periodKind === "annual");
  const cfHistoryNote =
    kind === "cf" && annualCols.length > 0 && annualCols.length < 5 ? (
      <p className="text-sm text-muted-foreground">
        Showing {annualCols.length} of the last 5 financial years — only these had XBRL filings available on NSE.
        No figures are estimated or filled in; a year appears here only when its filing was actually parsed.
      </p>
    ) : null;

  return (
    <div className="space-y-5">
      {head}
      {cfHistoryNote}
      {/* Desktop: full-width key-lines table, unchanged */}
      <div className="hidden md:block">
        <StatementTable rows={rows} cols={cols} caption={`${name}: key lines`} onlyTotals />
      </div>
      {/* Mobile: latest two periods first, full history one tap away */}
      <div className="md:hidden">
        <MobileKeyLines rows={rows} cols={cols} name={name} />
      </div>
      <Fold title={`Every line of the ${name.toLowerCase()}`}>
        <StatementTable rows={rows} cols={cols} caption={name} />
      </Fold>
    </div>
  );
}

const GLOSSARY: [string, string][] = [
  ["ROE (return on equity)", "Profit earned for every ₹100 of the owners' money. Above 15% is usually good."],
  ["ROCE (return on capital employed)", "Profit from all money put into the business, including loans. Above 15% is usually good."],
  ["Debt to equity", "Borrowed money divided by owners' money. Under 1× is comfortable."],
  ["Interest coverage", "How many times profit covers the yearly interest bill. Above 3× is comfortable."],
  ["Current ratio", "Short-term assets divided by short-term bills. Above 1× means it can pay what is due soon."],
  ["Cash conversion cycle", "Days between paying for stock and getting paid. Positive means cash is tied up; a negative number means suppliers fund the business."],
  ["DSO / DIO / DPO", "Days customers take to pay / days stock sits unsold / days the company takes to pay suppliers."],
  ["EBITDA margin", "Profit before interest, tax and depreciation as a share of sales (PBDIT convention)."],
];

/** Working capital and ratios: the five numbers that matter, then the full tables and a glossary. */
export function RatiosView({ wc, ratios, cols, annualized }: { wc: WorkingCapitalMetrics[]; ratios: FinancialRatioMetrics[]; cols?: StatementColumn[]; annualized?: boolean }) {
  const r = ratios[ratios.length - 1];
  const w = wc[wc.length - 1];
  if (!r && !w) return <p className="text-base text-muted-foreground">No ratios available yet.</p>;
  const good = r && (r.rocePct ?? 0) >= 15 && (r.debtToEquity ?? 9) < 1;
  const bad = r && ((r.debtToEquity ?? 0) > 2 || (r.interestCoverage != null && r.interestCoverage < 1.5));
  const tone: Tone = good ? "good" : bad ? "bad" : "info";
  const line = good
    ? `Earns well on the money invested (ROCE ${r!.rocePct!.toFixed(0)}%) without heavy debt.`
    : bad
      ? "Debt looks heavy compared with what the company earns. Check the numbers below."
      : "A mixed picture. Compare each number with what is normal for the industry.";

  return (
    <div className="space-y-5">
      <Takeaway tone={tone} sub={r ? `Latest period: ${r.periodLabel}${annualized ? " (return ratios annualized ×4 from the quarter)" : ""}.` : undefined}>{line}</Takeaway>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label={`Return on owners' money (ROE)${annualized ? " (annualized)" : ""}`} value={r?.roePct != null ? `${r.roePct.toFixed(1)}%` : "—"} hint={`Profit for every ₹100 the owners put in.${annualized ? " Annualized (×4) from the quarterly figure." : ""}`} />
        <Tile label={`Return on all capital (ROCE)${annualized ? " (annualized)" : ""}`} value={r?.rocePct != null ? `${r.rocePct.toFixed(1)}%` : "—"} hint={`Profit for every ₹100 invested, including loans.${annualized ? " Annualized (×4) from the quarterly figure." : ""}`} tone={r?.rocePct != null ? (r.rocePct >= 15 ? "good" : r.rocePct < 8 ? "watch" : "info") : "info"} />
        <Tile label="Debt vs own money" value={x2(r?.debtToEquity, "×")} hint="Borrowed money per ₹1 of owners' money. Lower is safer." tone={r?.debtToEquity != null ? (r.debtToEquity < 0.5 ? "good" : r.debtToEquity > 2 ? "bad" : "info") : "info"} />
        <Tile label="Interest cover" value={x2(r?.interestCoverage, "×")} hint="Times profit covers the interest bill. Under 1.5× is thin." tone={r?.interestCoverage != null ? (r.interestCoverage < 1.5 ? "bad" : r.interestCoverage >= 3 ? "good" : "info") : "info"} />
        <Tile label="Short-term bills cover" value={x2(r?.currentRatio, "×")} hint="Above 1× means it can pay what is due soon." tone={r?.currentRatio != null ? (r.currentRatio < 1 ? "watch" : "info") : "info"} />
        <Tile label="Cash conversion cycle" value={days(w?.ccc)} hint={w?.ccc == null ? "Days between paying for stock and getting paid." : w.ccc < 0 ? "Negative: suppliers fund the business; no cash is locked up." : "Days between paying for stock and getting paid. Fewer is better."} />
      </div>

      {wc.length ? (
        <Fold title="Working capital by period (days)">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold">
                  <th className="py-2 pl-3 pr-2">Measure</th>
                  {wc.map((x) => {
                    const c = cols?.find((col) => col.key === x.periodKey);
                    return (
                      <th key={x.periodKey} className="px-3 py-2 text-right">
                        <div>{x.periodLabel}</div>
                        {c && basisLabel(c.basis) ? <div className="text-sm font-normal text-muted-foreground">{basisLabel(c.basis)}</div> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {([["Customers take to pay (DSO)", "dso"], ["Stock sits unsold (DIO)", "dio"], ["Company takes to pay suppliers (DPO)", "dpo"], ["Cash conversion cycle", "ccc"]] as const).map(([label, k]) => (
                  <tr key={k} className={k === "ccc" ? "bg-primary/5 font-semibold" : ""}>
                    <td className="py-2 pl-3">{label}</td>
                    {wc.map((x) => <td key={x.periodKey} className="px-3 py-2 text-right tabular-nums">{days(x[k])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-1 pt-2 text-sm text-muted-foreground">DPO = trade payables ÷ cost of goods sold (materials + stock-in-trade + inventory changes). For contractors, site and subcontracting costs sit in other expenses, so DPO reads higher than the cash reality.</p>
        </Fold>
      ) : null}

      {ratios.length ? (
        <Fold title="All ratios by period">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold">
                  <th className="py-2 pl-3 pr-2">Ratio</th>
                  {ratios.map((x) => {
                    const c = cols?.find((col) => col.key === x.periodKey);
                    return (
                      <th key={x.periodKey} className="px-3 py-2 text-right">
                        <div>{x.periodLabel}</div>
                        {c && basisLabel(c.basis) ? <div className="text-sm font-normal text-muted-foreground">{basisLabel(c.basis)}</div> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {([["EBITDA margin", "opmPct", "%"], ["Net profit margin", "npmPct", "%"], [`Return on equity${annualized ? " (annualized)" : ""}`, "roePct", "%"], [`Return on capital employed${annualized ? " (annualized)" : ""}`, "rocePct", "%"], ["Debt to equity", "debtToEquity", "×"], ["Current ratio", "currentRatio", "×"], ["Interest coverage", "interestCoverage", "×"], ["Operating cash flow / net profit", "cfoToNetProfit", "×"]] as const).map(([label, k, u]) => (
                  <tr key={k}>
                    <td className="py-2 pl-3">{label}</td>
                    {ratios.map((x) => <td key={x.periodKey} className="px-3 py-2 text-right tabular-nums">{x2(x[k], u)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fold>
      ) : null}

      <Fold title="New to this? Terms in plain English">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {GLOSSARY.map(([t, d]) => (
            <div key={t}>
              <dt className="text-base font-medium">{t}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </Fold>
    </div>
  );
}
