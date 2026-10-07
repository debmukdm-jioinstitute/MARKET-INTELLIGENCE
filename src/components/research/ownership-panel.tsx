"use client";

import { Panel } from "@/components/layout/page-header";
import { Fold, Takeaway, type Tone } from "@/components/guide/explain";
import { SourceEye } from "@/components/ui/source-eye";
import { cn } from "@/lib/utils";
import type { OwnershipFlag, OwnershipRow } from "@/lib/research/ownership";
import { quarterLabel } from "@/lib/research/ownership";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";

type SeriesPoint = Pick<OwnershipRow, "broadcastDate" | "quarterEnd" | "promoterPct" | "fiiPct" | "diiPct" | "publicPct" | "pledgePct" | "shareholderCount" | "xbrlUrl">;
type OwnershipResponse = {
  symbol: string;
  dbConfigured: boolean;
  latest: OwnershipRow | null;
  promoterStatus?: "present" | "none" | "unknown";
  series: SeriesPoint[];
  flags: OwnershipFlag[];
  nseUrl: string;
};

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadOwnership(url: string): Promise<OwnershipResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as OwnershipResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const COLORS = { promoter: "#1a73e8", foreign: "#0f9d58", domestic: "#f9ab00", other: "#9aa0a6" } as const;
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(2)}%`);
const SRC = "NSE shareholding pattern filing (XBRL)";

type Slice = { key: string; label: string; value: number; color: string; hint: string };

function slicesOf(l: Pick<OwnershipRow, "promoterPct" | "fiiPct" | "diiPct" | "publicPct">): Slice[] {
  const promoter = l.promoterPct ?? 0;
  if (l.fiiPct != null && l.diiPct != null) {
    return [
      { key: "promoter", label: "Promoters", value: promoter, color: COLORS.promoter, hint: "The people who started or run the company." },
      { key: "foreign", label: "Foreign funds", value: l.fiiPct, color: COLORS.foreign, hint: "Overseas institutions (FIIs)." },
      { key: "domestic", label: "Indian funds", value: l.diiPct, color: COLORS.domestic, hint: "Mutual funds, insurers and banks (DIIs)." },
      { key: "other", label: "Everyone else", value: Math.max(0, 100 - promoter - l.fiiPct - l.diiPct), color: COLORS.other, hint: "Individual investors, companies and employee trusts." },
    ];
  }
  return [
    { key: "promoter", label: "Promoters", value: promoter, color: COLORS.promoter, hint: "The people who started or run the company." },
    { key: "other", label: "Public", value: l.publicPct != null && l.publicPct <= 100 - promoter + 0.5 ? l.publicPct : Math.max(0, 100 - promoter), color: COLORS.other, hint: "Everyone who is not a promoter. Foreign / Indian fund split not available in this filing." },
  ];
}

/** Number that counts up the first time it scrolls into view. */
function CountUp({ value, decimals = 2, suffix = "%" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  // Starts at the true value so the number is always right (no-JS, hidden tab); counts up from 0 only once seen.
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, value, { duration: 1.1, ease: "easeOut", onUpdate: setShown });
    return () => {
      c.stop();
      setShown(value);
    };
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className="tabular-nums">
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function KpiTile({ label, children, hint, tone = "info", eye, delay }: { label: string; children: React.ReactNode; hint: string; tone?: Tone; eye: React.ReactNode; delay: number }) {
  const ring = tone === "good" ? "border-emerald-500/40 bg-emerald-500/5" : tone === "watch" ? "border-amber-500/50 bg-amber-500/5" : tone === "bad" ? "border-rose-500/50 bg-rose-500/5" : "border-border bg-card";
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay }} whileHover={{ y: -3 }} className={cn("rounded-2xl border p-5 shadow-sm", ring)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-foreground">{label}</p>
        {eye}
      </div>
      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-foreground">{children}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

function DonutHero({ slices, centerTop, centerBottom }: { slices: Slice[]; centerTop: string; centerBottom: string }) {
  const reduce = useReducedMotion();
  const data = slices.filter((s) => s.value > 0);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.length ? data : [{ key: "none", label: "No data", value: 100, color: "#e5e7eb", hint: "" }]} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="96%" paddingAngle={data.length > 1 ? 2 : 0} cornerRadius={8} startAngle={90} endAngle={-270} isAnimationActive={!reduce} animationDuration={1200} animationEasing="ease-out" stroke="none">
            {(data.length ? data : [{ color: "#e5e7eb", key: "none" }]).map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ borderRadius: 12, fontSize: 14 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-extrabold tracking-tight text-foreground">{centerTop}</span>
        <span className="mt-1 max-w-[9rem] text-sm font-medium leading-tight text-muted-foreground">{centerBottom}</span>
      </div>
    </div>
  );
}

function StackBar({ slices }: { slices: Slice[] }) {
  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-xl bg-muted" role="img" aria-label="Ownership split bar">
        {slices.filter((s) => s.value > 0).map((s, i) => (
          <motion.div key={s.key} initial={{ width: 0 }} whileInView={{ width: `${s.value}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }} style={{ background: s.color }} className="flex items-center justify-center overflow-hidden text-sm font-bold text-white" title={`${s.label} ${s.value.toFixed(2)}%`}>
            {s.value >= 9 ? `${s.value.toFixed(0)}%` : ""}
          </motion.div>
        ))}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {slices.map((s) => (
          <li key={s.key} className="flex items-start gap-2 text-sm">
            <span className="mt-1 size-3.5 shrink-0 rounded" style={{ background: s.color }} aria-hidden />
            <span>
              <span className="font-semibold text-foreground">{s.label}</span> <span className="tabular-nums text-muted-foreground">{pct(s.value)}</span>
              <span className="block text-muted-foreground">{s.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendChart({ series }: { series: SeriesPoint[] }) {
  const reduce = useReducedMotion();
  const rows = series.map((p) => {
    const s = slicesOf(p);
    const get = (k: string) => s.find((x) => x.key === k)?.value ?? 0;
    return { q: labelFor(p, series), Promoters: get("promoter"), "Foreign funds": get("foreign"), "Indian funds": get("domestic"), "Everyone else": get("other") };
  });
  const detailed = series.some((p) => p.fiiPct != null && p.diiPct != null);
  const layers = detailed
    ? [["Promoters", COLORS.promoter], ["Foreign funds", COLORS.foreign], ["Indian funds", COLORS.domestic], ["Everyone else", COLORS.other]]
    : [["Promoters", COLORS.promoter], ["Everyone else", COLORS.other]];
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e5e7eb)" />
          <XAxis dataKey="q" tick={{ fontSize: 13 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`} tick={{ fontSize: 13 }} tickLine={false} axisLine={false} width={48} />
          <Tooltip formatter={(v, n, item) => [`${Number((item?.payload as Record<string, number>)?.[String(n)] ?? v).toFixed(2)}%`, String(n)]} contentStyle={{ borderRadius: 12, fontSize: 14 }} />
          {layers.map(([k, c]) => (
            <Area key={k} type="monotone" dataKey={k} stackId="own" stroke={c} fill={c} fillOpacity={0.85} isAnimationActive={!reduce} animationDuration={1300} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** "Jun 2026", or the full date when two filings share a month (e.g. a one-off Dec 2 and the Dec 31 quarter). */
function labelFor(p: SeriesPoint, all: SeriesPoint[]): string {
  const base = quarterLabel(p);
  const dup = all.filter((x) => quarterLabel(x) === base).length > 1;
  return dup && p.quarterEnd ? fmtDay(p.quarterEnd) : base;
}

const arrow = (cur: number | null, prev: number | null) => {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 100) / 100;
  if (d === 0) return <span className="ml-1 text-muted-foreground">·</span>;
  return <span className={cn("ml-1 text-sm font-semibold", d > 0 ? "text-emerald-600" : "text-rose-600")}>{d > 0 ? "▲" : "▼"}{Math.abs(d).toFixed(2)}</span>;
};

function QuarterTable({ series, noPromoter }: { series: SeriesPoint[]; noPromoter: boolean }) {
  const rows = [...series].reverse();
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-muted/60 text-left text-sm font-semibold text-foreground">
          <tr>
            <th className="px-3 py-2.5">Quarter</th>
            <th className="px-3 py-2.5">Filed</th>
            <th className="px-3 py-2.5 text-right">Promoters</th>
            <th className="px-3 py-2.5 text-right">Foreign funds</th>
            <th className="px-3 py-2.5 text-right">Indian funds</th>
            <th className="px-3 py-2.5 text-right">Everyone else</th>
            <th className="px-3 py-2.5 text-right">Pledged</th>
            <th className="px-3 py-2.5 text-right">Holders</th>
            <th className="px-3 py-2.5 text-right">Filing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const prev = rows[i + 1] ?? null;
            const s = slicesOf(p);
            const other = s.find((x) => x.key === "other")?.value ?? null;
            const hasSplit = p.fiiPct != null && p.diiPct != null;
            return (
              <tr key={p.broadcastDate} className={cn("border-t border-border", i === 0 && "bg-primary/5 font-medium")}>
                <td className="px-3 py-2.5 font-semibold text-foreground">{labelFor(p, series)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDay(p.broadcastDate)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{noPromoter && !p.promoterPct ? <span className="text-muted-foreground">None</span> : pct(p.promoterPct)}{arrow(p.promoterPct, prev?.promoterPct ?? null)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{pct(p.fiiPct)}{arrow(p.fiiPct, prev?.fiiPct ?? null)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{pct(p.diiPct)}{arrow(p.diiPct, prev?.diiPct ?? null)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{hasSplit ? pct(other) : <span className="text-muted-foreground" title="This older filing does not split foreign and Indian funds">—</span>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{noPromoter ? <span className="text-muted-foreground">N/A</span> : pct(p.pledgePct)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{p.shareholderCount ? p.shareholderCount.toLocaleString("en-IN") : "—"}</td>
                <td className="px-3 py-2.5 text-right">{p.xbrlUrl ? <a href={p.xbrlUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Open ↗</a> : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OwnershipPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<OwnershipResponse>(`/api/research/ownership?symbol=${encodeURIComponent(symbol)}&v=3`, loadOwnership, { revalidateOnFocus: false });
  const l = data?.latest ?? null;
  const noPromoter = data?.promoterStatus === "none";
  const asOf = l ? `${l.broadcastDate}T00:00:00Z` : null;
  const slices = useMemo(() => (l ? slicesOf(l) : []), [l]);
  const eye = (label: string, method: string) => <SourceEye label={label} source={SRC} asOf={asOf} url={l?.xbrlUrl ?? data?.nseUrl} method={method} note="Filed data shown as filed, not investment advice" />;

  return (
    <Panel
      id="shareholding"
      title="Who owns it (Shareholding Pattern)"
      subtitle="Promoter, institution and pledge holding from the company's quarterly filings with NSE."
      trust={{ source: SRC, asOf, note: "Filed data shown as filed, not investment advice" }}
    >
      {isLoading ? <p className="animate-pulse text-base text-muted-foreground">Loading ownership for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-base text-rose-700">Could not load ownership data right now. Try again in a moment.</p> : null}
      {data && !error && !l ? (
        <p className="text-base text-muted-foreground">
          No shareholding filings collected for {symbol} yet.{" "}
          <a href={data.nseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            See NSE directly ↗
          </a>
        </p>
      ) : null}

      {data && !error && l ? (
        <div className="space-y-6">
          {(() => {
            const pledge = l.pledgePct ?? 0;
            const high = data.flags.some((f) => f.severity === "high");
            const funds = (l.fiiPct ?? 0) + (l.diiPct ?? 0);
            if (noPromoter) {
              return (
                <Takeaway
                  tone="info"
                  sub="No promoter group is registered with the exchange, so there is no single founder or family in control and no promoter shares that could be pledged. Founders and directors can still hold shares in their personal capacity: see Leadership below."
                >
                  {symbol} is professionally managed: it reports no promoters.{funds > 0 ? ` Large funds own ${funds.toFixed(1)}% instead.` : ""}
                </Takeaway>
              );
            }
            if (l.promoterPct == null) return <Takeaway tone="info">The promoter holding for {symbol} was not readable in the latest filing. Open the filing to check.</Takeaway>;
            const tone: Tone = high || pledge >= 25 ? "bad" : data.flags.length || pledge >= 5 ? "watch" : "good";
            const promoter = `${l.promoterPct.toFixed(1)}%`;
            const pledgeKnown = l.pledgePct != null;
            const line =
              tone === "good"
                ? `Founders and promoters own ${promoter}. ${!pledgeKnown ? "Pledge details are not in this filing yet." : pledge > 0 ? `${pledge.toFixed(1)}% of their shares are pledged, which is low.` : "None of their shares are pledged for loans."}`
                : tone === "watch"
                  ? `Promoters own ${promoter}, but ${pledge >= 5 ? `${pledge.toFixed(1)}% of their shares are pledged for loans` : "a recent change in holding is flagged"}. Worth a look.`
                  : `Warning: ${pledge >= 25 ? `${pledge.toFixed(1)}% of promoter shares are pledged for loans` : "a serious holding change is flagged"}. If those loans go bad, shares can be sold forcibly.`;
            return <Takeaway tone={tone}>{line}</Takeaway>;
          })()}

          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
            <DonutHero slices={slices} centerTop={noPromoter ? `${(((l.fiiPct ?? 0) + (l.diiPct ?? 0)) || (l.publicPct ?? 0)).toFixed(0)}%` : `${(l.promoterPct ?? 0).toFixed(0)}%`} centerBottom={noPromoter ? ((l.fiiPct ?? 0) + (l.diiPct ?? 0) > 0 ? "held by funds" : "public holding") : "held by promoters"} />
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiTile label="Promoters own" delay={0} hint={noPromoter ? "No promoter group. The company is run by professional managers." : "The people who started or run the company."} tone={noPromoter ? "info" : "info"} eye={eye("Promoter holding", "Read from the 'Shareholding of promoter and promoter group' line of the quarterly filing.")}>
                {l.promoterPct == null ? "—" : noPromoter ? "None" : <CountUp value={l.promoterPct} />}
              </KpiTile>
              <KpiTile label="Foreign funds own" delay={0.08} hint={l.fiiPct != null ? "Overseas institutions (FIIs)." : "Not split out of this filing yet."} eye={eye("Foreign institutional holding", "Read from the 'Institutions (Foreign)' line of the filing's XBRL file.")}>
                {l.fiiPct != null ? <CountUp value={l.fiiPct} /> : "—"}
              </KpiTile>
              <KpiTile label="Indian funds own" delay={0.16} hint={l.diiPct != null ? "Mutual funds, insurers and banks (DIIs)." : "Not split out of this filing yet."} eye={eye("Domestic institutional holding", "Read from the 'Institutions (Domestic)' line of the filing's XBRL file.")}>
                {l.diiPct != null ? <CountUp value={l.diiPct} /> : "—"}
              </KpiTile>
              <KpiTile label="Promoter shares pledged" delay={0.24} hint={noPromoter ? "Not applicable: there are no promoter shares to pledge." : l.pledgePct == null ? "Pledge details are not in this filing's data." : "Shares given as security for loans. Lower is safer."} tone={noPromoter || l.pledgePct == null ? "info" : l.pledgePct >= 25 ? "bad" : l.pledgePct >= 5 ? "watch" : "good"} eye={eye("Promoter pledge", "Read from the 'Shares pledged or encumbered' facts of the promoter group in the filing's XBRL file.")}>
                {noPromoter ? "N/A" : l.pledgePct == null ? "—" : <CountUp value={l.pledgePct} />}
              </KpiTile>
            </div>
          </div>

          <StackBar slices={slices} />

          <p className="text-sm text-muted-foreground">
            {quarterLabel(l)} quarter · filed with NSE on {fmtDay(l.broadcastDate)}
            {l.shareholderCount ? ` · ${l.shareholderCount.toLocaleString("en-IN")} shareholders` : ""} ·{" "}
            <a href={l.xbrlUrl ?? data.nseUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              {l.xbrlUrl ? "Source filing ↗" : "NSE ↗"}
            </a>
          </p>

          {data.flags.length ? (
            <ul className="space-y-2">
              {data.flags.map((f) => (
                <li key={`${f.label}-${f.broadcastDate}`} className={cn("flex flex-wrap items-start gap-2 rounded-md border p-3 text-base", f.severity === "high" ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50")}>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", f.severity === "high" ? "bg-rose-600 text-white" : "bg-amber-500 text-white")}>{f.label}</span>
                  <span className="min-w-0 flex-1 text-foreground">{f.detail}</span>
                  {f.filingUrl ? (
                    <a href={f.filingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                      Filing ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {data.series.length > 1 ? (
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-foreground">How the owners changed, quarter by quarter</h4>
              <TrendChart series={data.series} />
              <QuarterTable series={data.series} noPromoter={noPromoter} />
              {data.series.some((p) => p.fiiPct == null || p.diiPct == null) ? <p className="text-sm text-muted-foreground">A dash means that older filing does not split out foreign and Indian funds, so "everyone else" cannot be worked out for it.</p> : null}
            </div>
          ) : null}

          <Fold title="What these terms mean">
            <p className="text-base leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Promoter</span> = the people or family who started or control the company; some large companies, such as HDFC Bank, ITC and Eternal, have none.{" "}
              <span className="font-semibold text-foreground">Pledge</span> = promoter shares given as collateral for loans. A high pledge can mean forced selling if those loans go bad.{" "}
              <span className="font-semibold text-foreground">Everyone else</span> = individual investors, companies and employee trusts. ▲▼ in the table show the change from the previous quarter.
            </p>
          </Fold>
        </div>
      ) : null}
    </Panel>
  );
}
