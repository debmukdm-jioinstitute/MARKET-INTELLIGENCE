"use client";

import { Panel } from "@/components/layout/page-header";
import {
  useAutoSales,
  useFbilRates,
  useGstCollections,
  useMonsoon,
  usePowerDemand,
  useUpiStats,
  useWorldBankIndia,
} from "@/hooks/use-alt-macro";
import type { CurveRow, MonthlyPoint, RefRate } from "@/lib/macro/alt-types";
import type { ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BLUE = "#1a73e8";
const GREEN = "#188038";
const RED = "#d93025";
const AMBER = "#e37400";
const AXIS = { fontSize: 10, fill: "#5f6368", tickLine: false } as const;

/* ---------- small building blocks ---------- */

const nf = (digits: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const n0 = nf(0);
const n1 = nf(1);
const n2 = nf(2);
const n4 = nf(4);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}
function dayLabel(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** A figure that always links to the page it came from. */
function Src({ href, children, title }: { href: string; children: ReactNode; title?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title ?? "Open the source"} className="text-inherit underline decoration-dotted underline-offset-2 hover:text-primary">
      {children}
    </a>
  );
}

function Delta({ pct, suffix = "vs a year ago" }: { pct: number | null; suffix?: string }) {
  if (pct === null || !Number.isFinite(pct)) return <span className="text-xs text-muted-foreground">Year-ago figure not stored yet</span>;
  const up = pct >= 0;
  return (
    <span className="text-xs font-medium tabular-nums" style={{ color: up ? GREEN : RED }}>
      {up ? "▲" : "▼"} {n1.format(Math.abs(pct))}% <span className="font-normal text-muted-foreground">{suffix}</span>
    </span>
  );
}

function Empty({ what, error }: { what: string; error?: string | null }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{what} is not available right now.</p>
      <p className="mt-1">We only show figures we have actually collected from the official source — nothing is estimated.</p>
      {error ? <p className="mt-1 text-xs">Last collector note: {error}</p> : null}
    </div>
  );
}

function Loading({ what }: { what: string }) {
  return <p className="text-sm text-muted-foreground">Loading {what}…</p>;
}

function Spark({ data, color = BLUE, height = 56 }: { data: { x: string; y: number }[]; color?: string; height?: number }) {
  if (data.length < 2) return <div className="flex items-center text-xs text-muted-foreground" style={{ height }}>Chart builds up as more days are collected</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => n2.format(Number(v))} labelFormatter={(l) => String(l)} />
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          <XAxis dataKey="x" hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: ReactNode; href: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        <Src href={href}>{value}</Src>
      </p>
      {sub ? <p className="mt-0.5">{sub}</p> : null}
    </div>
  );
}

function SectionTitle({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-foreground">{children}</h2>
      {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  );
}

const SourceLine = ({ name, url, asOf }: { name: string; url: string; asOf?: string | null }) => (
  <p className="mt-3 text-xs text-muted-foreground">
    Source: <Src href={url}>{name}</Src>
    {asOf ? <> · latest data {dayLabel(asOf)}</> : null}
  </p>
);

/* ---------- Rates & benchmarks (FBIL) ---------- */

const TENOR_WORDS: Record<string, string> = { on: "Overnight" };
const tenorText = (t: string) => TENOR_WORDS[t] ?? t.toUpperCase();

function UsdInrCard({ rate: r, others }: { rate: RefRate | null; others: RefRate[] }) {
  if (!r) return <Empty what="The dollar–rupee reference rate" />;
  const change = r.prev !== null ? ((r.value - r.prev) / r.prev) * 100 : null;
  return (
    <Panel title="US dollar in rupees">
      <p className="text-3xl font-semibold tabular-nums">
        ₹<Src href={r.url}>{n4.format(r.value)}</Src>
      </p>
      <p className="text-sm text-muted-foreground">Official reference rate for 1 US dollar · {dayLabel(r.date)}</p>
      <div className="mt-1">{change !== null ? <Delta pct={change} suffix="vs the day before" /> : null}</div>
      <Spark data={r.series.map((p) => ({ x: dayLabel(p.date), y: p.value }))} />
      <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {others.map((o) => (
          <li key={o.code} className="rounded-lg bg-muted/40 px-2 py-1.5">
            <span className="text-muted-foreground">{o.code}</span>{" "}
            <Src href={o.url} title={`${o.code} reference rate (${o.unit})`}>
              <span className="tabular-nums font-medium">₹{n2.format(o.value)}</span>
            </Src>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CurveChips({ rows, title }: { rows: CurveRow[]; title: string }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {rows.map((r) => {
          const d = r.prev !== null ? r.value - r.prev : null;
          return (
            <li key={r.tenor} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground">{tenorText(r.tenor)}</span>{" "}
              <Src href={r.url}>
                <span className="font-semibold tabular-nums">{n2.format(r.value)}%</span>
              </Src>
              {d !== null && Math.abs(d) >= 0.005 ? (
                <span className="ml-1 tabular-nums" style={{ color: d > 0 ? RED : GREEN }}>
                  {d > 0 ? "+" : "−"}
                  {n2.format(Math.abs(d))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MoneyMarketCard({ d }: { d: NonNullable<ReturnType<typeof useFbilRates>["data"]> }) {
  const o = d.overnight;
  const singles = [o.mibor && { label: "Overnight MIBOR", r: o.mibor }, o.mror && { label: "MROR (repo)", r: o.mror }, o.sorr && { label: "SORR (secured)", r: o.sorr }].filter(Boolean) as { label: string; r: RefRate }[];
  return (
    <Panel title="Short-term borrowing costs">
      <p className="mb-3 text-sm text-muted-foreground">What banks pay to borrow money for a day, a month or a few years — the base for most loan and deposit rates.</p>
      {singles.length ? (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {singles.map((s) => (
            <Stat key={s.label} label={s.label} value={`${n2.format(s.r.value)}%`} href={s.r.url} sub={<span className="text-xs text-muted-foreground">{dayLabel(s.r.date)}</span>} />
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        <CurveChips rows={d.mibor.ois} title="Expected average rate (MIBOR-OIS)" />
        <CurveChips rows={d.mibor.term} title="Term MIBOR" />
        <CurveChips rows={d.tbill.filter((t) => ["7d", "1m", "3m", "6m", "12m"].includes(t.tenor))} title="Government T-bill yields" />
      </div>
    </Panel>
  );
}

function GSecCurveCard({ d }: { d: NonNullable<ReturnType<typeof useFbilRates>["data"]> }) {
  const curve = d.gsec.parYieldCurve;
  const ten = d.gsec.tenYear;
  if (!curve.length) return <Empty what="The government bond yield curve" />;
  return (
    <Panel title="Government bond yield curve">
      <p className="text-sm text-muted-foreground">What the government pays to borrow for 3 months up to 30 years (par yield).</p>
      {ten ? (
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          <Src href={ten.url}>{n2.format(ten.value)}%</Src> <span className="text-sm font-normal text-muted-foreground">10-year · {dayLabel(ten.date)}</span>
        </p>
      ) : null}
      <div className="mt-2 h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve.map((c) => ({ tenor: tenorText(c.tenor), yield: c.value }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e8eaed" vertical={false} />
            <XAxis dataKey="tenor" tick={AXIS} />
            <YAxis domain={["dataMin - 0.2", "dataMax + 0.2"]} tick={AXIS} width={36} tickFormatter={(v) => `${n1.format(Number(v))}%`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${n2.format(Number(v))}%`} />
            <Line type="monotone" dataKey="yield" stroke={BLUE} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {ten && ten.series.length > 1 ? (
        <>
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">10-year yield, last 30 days</p>
          <Spark data={ten.series.map((p) => ({ x: dayLabel(p.date), y: p.value }))} height={44} />
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">The 30-day trend fills in as FBIL publishes each day.</p>
      )}
    </Panel>
  );
}

export function RatesSection() {
  const { data, loading, error } = useFbilRates();
  return (
    <section aria-labelledby="alt-rates">
      <SectionTitle note="Official daily benchmarks published by FBIL (Financial Benchmarks India), the body RBI appointed to set them.">
        <span id="alt-rates">Rates and benchmarks</span>
      </SectionTitle>
      {loading ? <Loading what="rates" /> : !data || !data.available ? <Empty what="FBIL benchmark data" error={data?.error ?? error} /> : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <UsdInrCard rate={data.usdInr} others={data.otherRefs} />
            <MoneyMarketCard d={data} />
            <GSecCurveCard d={data} />
          </div>
          <SourceLine name={data.source.name} url={data.source.url} asOf={data.asOf} />
        </>
      )}
    </section>
  );
}

/* ---------- India in the world (World Bank) ---------- */

const WB_SHOW = [
  { code: "NY.GDP.MKTP.CD", title: "Size of the economy (GDP)", blurb: "Everything India produces in a year, in US dollars.", fmt: (v: number) => `$${n2.format(v / 1e12)} trillion` },
  { code: "FP.CPI.TOTL.ZG", title: "Price rise (inflation)", blurb: "How much prices went up over the year.", fmt: (v: number) => `${n1.format(v)}%` },
  { code: "GC.DOD.TOTL.GD.ZS", title: "Government debt", blurb: "What the central government owes, as a share of GDP.", fmt: (v: number) => `${n1.format(v)}% of GDP` },
];
const WB_MORE = [
  { code: "NE.EXP.GNFS.ZS", title: "Exports", fmt: (v: number) => `${n1.format(v)}% of GDP` },
  { code: "NE.IMP.GNFS.ZS", title: "Imports", fmt: (v: number) => `${n1.format(v)}% of GDP` },
  { code: "FR.INR.RINR", title: "Real interest rate", fmt: (v: number) => `${n1.format(v)}%` },
];

export function WorldSection() {
  const { data, loading, error } = useWorldBankIndia();
  const by = (code: string) => data?.indicators.find((i) => i.code === code);
  return (
    <section aria-labelledby="alt-world">
      <SectionTitle note="Yearly figures from the World Bank. They are published with a delay, so each card shows the year the number is for.">
        <span id="alt-world">India in the world</span>
      </SectionTitle>
      {loading ? <Loading what="World Bank data" /> : !data || !data.available ? <Empty what="World Bank data" error={data?.error ?? error} /> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {WB_SHOW.map((w) => {
              const i = by(w.code);
              return (
                <Panel key={w.code} title={w.title}>
                  {i?.latest ? (
                    <>
                      <p className="text-2xl font-semibold tabular-nums">
                        <Src href={i.url}>{w.fmt(i.latest.value)}</Src>
                      </p>
                      <p className="text-xs text-muted-foreground">Data for {i.latest.year}. {w.blurb}</p>
                      <Spark data={i.series.map((p) => ({ x: String(p.year), y: p.value }))} color={BLUE} />
                      <p className="text-xs text-muted-foreground">
                        {i.series.length ? `${i.series[0]!.year}–${i.series[i.series.length - 1]!.year}` : ""}
                      </p>
                    </>
                  ) : (
                    <Empty what={w.title} />
                  )}
                </Panel>
              );
            })}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {WB_MORE.map((w) => {
              const i = by(w.code);
              return i?.latest ? (
                <li key={w.code} className="rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <span className="text-muted-foreground">{w.title}</span>{" "}
                  <Src href={i.url}><span className="font-semibold tabular-nums">{w.fmt(i.latest.value)}</span></Src>{" "}
                  <span className="text-muted-foreground">({i.latest.year})</span>
                </li>
              ) : null;
            })}
          </ul>
          <SourceLine name={data.source.name} url={data.source.url} />
        </>
      )}
    </section>
  );
}

/* ---------- Digital economy (UPI) + Tax collections (GST) ---------- */

function MonthlyChart({ data, color, format }: { data: MonthlyPoint[]; color: string; format: (v: number) => string }) {
  if (data.length < 2) return <p className="text-xs text-muted-foreground">Chart builds up as more months are collected.</p>;
  return (
    <div className="h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((p) => ({ month: monthLabel(p.month), value: p.value }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e8eaed" vertical={false} />
          <XAxis dataKey="month" tick={AXIS} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={AXIS} width={42} domain={["dataMin", "dataMax"]} tickFormatter={(v) => format(Number(v))} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => format(Number(v))} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function UpiCard() {
  const { data, loading, error } = useUpiStats();
  return (
    <Panel title="Digital economy · UPI">
      <p className="text-sm text-muted-foreground">UPI transactions — India&apos;s real-time payments pulse.</p>
      {loading ? <Loading what="UPI" /> : !data || !data.available ? <Empty what="UPI payment statistics" error={data?.error ?? error} /> : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Payments made" value={data.volumeMn.latest !== null ? `${n2.format(data.volumeMn.latest / 1000)} billion` : "—"} href={data.source.url} sub={<Delta pct={data.volumeMn.yoyPct} />} />
            <Stat label="Money moved" value={data.valueCr.latest !== null ? `₹${n2.format(data.valueCr.latest / 1e5)} lakh crore` : "—"} href={data.source.url} sub={<Delta pct={data.valueCr.yoyPct} />} />
          </div>
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Payments per month (billions), last {data.volumeMn.series.length} months</p>
          <MonthlyChart data={data.volumeMn.series} color={BLUE} format={(v) => n1.format(v / 1000)} />
          <SourceLine name={data.source.name} url={data.source.url} asOf={data.latestMonth ? `${data.latestMonth}-01` : null} />
        </>
      )}
    </Panel>
  );
}

function GstCard() {
  const { data, loading, error } = useGstCollections();
  return (
    <Panel title="Tax collections · GST">
      <p className="text-sm text-muted-foreground">Goods and Services Tax collected each month — a quick read on how much buying and selling is happening.</p>
      {loading ? <Loading what="GST" /> : !data || !data.available || data.latest === null ? (
        <Empty what="GST collections" error={data?.error ?? error} />
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            <Src href={data.source.url}>₹{n2.format(data.latest / 1e5)} lakh crore</Src>
          </p>
          <p className="text-xs text-muted-foreground">Gross GST collected in {data.latestMonth ? monthLabel(data.latestMonth) : "the latest month"}</p>
          <div className="mt-1"><Delta pct={data.yoyPct} /></div>
          <MonthlyChart data={data.series} color={GREEN} format={(v) => n1.format(v / 1e5)} />
          <SourceLine name={data.source.name} url={data.source.url} />
        </>
      )}
    </Panel>
  );
}

export function DigitalEconomySection() {
  return (
    <section aria-labelledby="alt-digital">
      <SectionTitle>
        <span id="alt-digital">Digital economy and taxes</span>
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <UpiCard />
        <GstCard />
      </div>
    </section>
  );
}

/* ---------- On the road (SIAM) ---------- */

export function AutoSection() {
  const { data, loading, error } = useAutoSales();
  return (
    <section aria-labelledby="alt-auto">
      <SectionTitle note="Vehicles sold by manufacturers to dealers each month — a sign of how confident families and businesses feel about spending.">
        <span id="alt-auto">On the road</span>
      </SectionTitle>
      {loading ? <Loading what="auto sales" /> : !data || !data.available ? <Empty what="Auto sales" error={data?.error ?? error} /> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {data.segments.map((s) => (
              <Panel key={s.key} title={s.label}>
                {s.units !== null ? (
                  <>
                    <p className="text-2xl font-semibold tabular-nums">
                      <Src href={s.url}>{n0.format(s.units)}</Src> <span className="text-sm font-normal text-muted-foreground">units</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Sold in {s.month ? monthLabel(s.month) : "the latest month"}</p>
                    <div className="mt-1">{s.yoyPct !== null ? <Delta pct={s.yoyPct} suffix="vs same month last year" /> : <span className="text-xs text-muted-foreground">Growth figure not stated in the release</span>}</div>
                    {s.series.length > 1 ? <Spark data={s.series.map((p) => ({ x: monthLabel(p.month), y: p.units }))} color={AMBER} /> : <p className="mt-2 text-xs text-muted-foreground">Trend builds up month by month.</p>}
                  </>
                ) : (
                  <Empty what={s.label} />
                )}
              </Panel>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{data.note}</p>
          <SourceLine name={data.source.name} url={data.source.url} />
        </>
      )}
    </section>
  );
}

/* ---------- Power demand + Monsoon ---------- */

function PowerCard() {
  const { data, loading, error } = usePowerDemand();
  return (
    <Panel title="Power demand">
      <p className="text-sm text-muted-foreground">Electricity use tracks real economic activity.</p>
      {loading ? <Loading what="power demand" /> : !data || !data.available || !data.latest ? <Empty what="Power demand" error={data?.error ?? error} /> : (
        <>
          <p className="mt-3 text-base">
            Factories and homes used up to <strong className="tabular-nums"><Src href={data.source.url}>{n1.format(data.latest.demandGw)} GW</Src></strong> at the busiest moment on {dayLabel(data.latest.day)}
            {data.latest.yoyPct !== null ? <>, {data.latest.yoyPct >= 0 ? "up" : "down"} <strong className="tabular-nums">{n1.format(Math.abs(data.latest.yoyPct))}%</strong> from a year earlier</> : null}.
          </p>
          {data.latest.energyMu !== null ? <p className="mt-1 text-xs text-muted-foreground">Total electricity supplied that day: {n0.format(data.latest.energyMu)} million units.</p> : null}
          {data.latest.yoyPct === null ? <p className="mt-1 text-xs text-muted-foreground">Year-ago comparison appears once last year&apos;s same day is stored.</p> : null}
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Busiest-moment demand, last {data.series.length} days (GW)</p>
          <Spark data={data.series.map((p) => ({ x: dayLabel(p.day), y: Math.round(p.demandMw / 100) / 10 }))} color={AMBER} height={70} />
          <SourceLine name={data.source.name} url={data.source.url} asOf={data.latest.day} />
        </>
      )}
    </Panel>
  );
}

function MonsoonCard() {
  const { data, loading, error } = useMonsoon();
  const inSeason = data?.mode === "season";
  const w = data?.window;
  const verdictText = data?.verdict === "ahead" ? "ahead of" : data?.verdict === "behind" ? "behind" : "close to";
  const verdictColor = data?.verdict === "ahead" ? GREEN : data?.verdict === "behind" ? RED : AMBER;
  return (
    <Panel title="Monsoon">
      <p className="text-sm text-muted-foreground">A weak monsoon hits farm incomes and rural spending.</p>
      {loading ? <Loading what="rainfall" /> : !data || !data.available ? <Empty what="Rainfall" error={data?.error ?? error} /> : (
        <>
          {w && w.pctOfNormal !== null ? (
            <p className={inSeason ? "mt-3 text-2xl font-semibold" : "mt-3 text-base"}>
              {inSeason ? "Monsoon" : "Last 90 days of rain"} at <strong className="tabular-nums" style={{ color: verdictColor }}>{n0.format(w.pctOfNormal)}% of normal</strong> — {verdictText} its recent average.
            </p>
          ) : (
            <p className="mt-3 text-base">We are still collecting enough past years of rainfall to say what is &quot;normal&quot;. The daily chart below is real data.</p>
          )}
          {w && w.actualMm !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {n0.format(w.actualMm)} mm on average across {data.locations} farm-belt points, {dayLabel(w.start)} to {dayLabel(w.end)}
              {w.normalMm !== null ? `; the average for the same dates in the ${w.yearsInNormal} earlier years we hold is ${n0.format(w.normalMm)} mm` : ""}.
            </p>
          ) : null}
          {!inSeason && data.season && data.season.pctOfNormal !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">The {data.seasonYear} June–September season ended at {n0.format(data.season.pctOfNormal)}% of normal.</p>
          ) : null}
          {inSeason && data.cumulative.length > 1 ? (
            <div className="mt-3 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.cumulative.map((c) => ({ day: dayLabel(c.date), Actual: c.actual, Normal: c.normal }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#e8eaed" vertical={false} />
                  <XAxis dataKey="day" tick={AXIS} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis tick={AXIS} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${n0.format(Number(v))} mm`} />
                  <Line type="monotone" dataKey="Actual" stroke={BLUE} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="Normal" stroke="#9aa0a6" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <>
              <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Daily rain, last {data.daily.length} days (mm, average of {data.locations} points)</p>
              <Spark data={data.daily.map((p) => ({ x: dayLabel(p.date), y: Math.round(p.value * 10) / 10 }))} color={BLUE} height={70} />
            </>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Rainfall here is weather-model data for six farming regions, a good guide to the trend but not the India Meteorological Department&apos;s official gauge count.</p>
          <SourceLine name={data.source.name} url={data.source.url} />
        </>
      )}
    </Panel>
  );
}

export function PulseSection() {
  return (
    <section aria-labelledby="alt-pulse">
      <SectionTitle>
        <span id="alt-pulse">Daily economic pulse</span>
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <PowerCard />
        <MonsoonCard />
      </div>
    </section>
  );
}

/** All new rates / India alt-data sections for the macro page. */
export function AltDataSections() {
  return (
    <div className="space-y-8">
      <RatesSection />
      <WorldSection />
      <DigitalEconomySection />
      <AutoSection />
      <PulseSection />
    </div>
  );
}
