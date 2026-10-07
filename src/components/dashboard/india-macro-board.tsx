"use client";

import { MetricInfo } from "@/components/ui/metric-info";
import type { FieldSource, IndiaDashboardPayload, MacroRow } from "@/lib/feeds/india/types";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  Database,
  Droplets,
  Factory,
  FileText,
  Globe2,
  Landmark,
  MoreVertical,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/* ---------------------------------- utils ---------------------------------- */

function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0]![0]},${pts[0]![1]}` : "";
  let d = `M ${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function Sparkline({ values, color, width = 120, height = 44 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const px = (i: number) => 4 + (i / (values.length - 1)) * (width - 8);
  const py = (v: number) => 4 + (1 - (v - min) / span) * (height - 8);
  const pts = values.map((v, i) => [px(i), py(v)] as const);
  const line = smoothPath(pts);
  const gid = `sp-${color.replace(/[^a-z0-9]/gi, "")}-${values.length}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${px(values.length - 1)},${height} L ${px(0)},${height} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

const trimNum = (n: number) => String(Math.round(n * 100) / 100);
const fmtPp = (pp: number | null) =>
  pp == null ? "—" : `${pp > 0 ? "+" : pp < 0 ? "-" : ""}${trimNum(Math.abs(pp))} pp`;

function dirStyle(direction: MacroRow["direction"]): { arrow: string; cls: string; hex: string } {
  if (direction === "up") return { arrow: "↑", cls: "text-emerald-500", hex: "#10b981" };
  if (direction === "down") return { arrow: "↓", cls: "text-rose-500", hex: "#f43f5e" };
  return { arrow: "→", cls: "text-muted-foreground", hex: "#9ca3af" };
}

const fmtVintage = (asOf?: string | null) => {
  if (!asOf) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(asOf)) return asOf.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(asOf)) return asOf;
  return asOf.length > 16 ? asOf.slice(0, 10) : asOf;
};

/* ------------------------------ indicator rows ------------------------------ */

type Category = "growth" | "inflation" | "rbi" | "external" | "manufacturing";

type IndicatorDef = {
  id: string;
  label: string;
  sub: string;
  metricKey: string;
  icon: LucideIcon;
  iconBox: string;
  category: Category;
  value: string;
  pp: number | null;
  direction: MacroRow["direction"];
  vintage: string | null;
  history: number[];
  source: FieldSource | undefined;
};

const CATEGORIES: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "growth", label: "Growth" },
  { id: "inflation", label: "Inflation" },
  { id: "rbi", label: "RBI" },
  { id: "external", label: "External" },
  { id: "manufacturing", label: "Manufacturing" },
];

function buildIndicators(data: IndiaDashboardPayload): IndicatorDef[] {
  const rows = data.indiaMacro ?? [];
  const getRow = (id: string) => rows.find((m) => m.id.toLowerCase().includes(id));
  const cpi = getRow("cpi");
  const gdp = getRow("gdp");
  const repo = getRow("repo");
  const pmiMfg = getRow("pmi_mfg");
  const pmiSvc = getRow("pmi_services");
  const gsec = data.pulse?.gsec10y;

  const ppOf = (r: MacroRow | undefined) =>
    r?.current != null && r?.previous != null ? r.current - r.previous : null;

  return [
    {
      id: "cpi",
      label: "CPI Inflation (YoY)",
      sub: "Retail inflation (CPI)",
      metricKey: "cpi",
      icon: BarChart3,
      iconBox: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      category: "inflation",
      value: cpi?.current != null ? `${cpi.current.toFixed(2)}%` : "—",
      pp: ppOf(cpi),
      direction: cpi?.direction ?? "na",
      vintage: fmtVintage(cpi?.source?.asOf ?? cpi?.history12m?.[cpi.history12m.length - 1]?.date),
      history: cpi?.history12m.map((h) => h.value) ?? [],
      source: cpi?.source,
    },
    {
      id: "gdp",
      label: "Real GDP Growth",
      sub: "Constant prices (YoY)",
      metricKey: "gdp",
      icon: TrendingUp,
      iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      category: "growth",
      value: gdp?.current != null ? `${gdp.current.toFixed(2)}%` : "—",
      pp: ppOf(gdp),
      direction: gdp?.direction ?? "na",
      vintage: fmtVintage(gdp?.source?.asOf),
      history: gdp?.history12m.map((h) => h.value) ?? [],
      source: gdp?.source,
    },
    {
      id: "repo",
      label: "RBI Policy Repo Rate",
      sub: "Policy rate",
      metricKey: "repo",
      icon: Landmark,
      iconBox: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      category: "rbi",
      value: data.rbiLiquidity.corridor?.repo ?? (repo?.current != null ? `${repo.current.toFixed(2)}%` : "—"),
      pp: ppOf(repo),
      direction: repo?.direction ?? "na",
      vintage: fmtVintage(repo?.source?.asOf),
      history: repo?.history12m.map((h) => h.value) ?? [],
      source: repo?.source,
    },
    {
      id: "gsec10y",
      label: "10Y G-Sec Sovereign Yield",
      sub: "Government bond yield",
      metricKey: "gsec10y",
      icon: FileText,
      iconBox: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      category: "external",
      value: gsec?.value != null ? `${gsec.value.toFixed(2)}%` : "—",
      pp: gsec?.change ?? null,
      direction: gsec?.change != null ? (gsec.change > 0.0001 ? "up" : gsec.change < -0.0001 ? "down" : "flat") : "na",
      vintage: fmtVintage(gsec?.source?.asOf),
      history: [],
      source: gsec?.source,
    },
    {
      id: "pmi_mfg",
      label: "PMI Manufacturing",
      sub: "Manufacturing activity",
      metricKey: "pmi_mfg",
      icon: Factory,
      iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      category: "manufacturing",
      value: pmiMfg?.current != null ? pmiMfg.current.toFixed(1) : "—",
      pp: ppOf(pmiMfg),
      direction: pmiMfg?.direction ?? "na",
      vintage: fmtVintage(pmiMfg?.source?.asOf),
      history: pmiMfg?.history12m.map((h) => h.value) ?? [],
      source: pmiMfg?.source,
    },
    {
      id: "pmi_services",
      label: "PMI Services",
      sub: "Services activity",
      metricKey: "pmi_services",
      icon: Briefcase,
      iconBox: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      category: "manufacturing",
      value: pmiSvc?.current != null ? pmiSvc.current.toFixed(1) : "—",
      pp: ppOf(pmiSvc),
      direction: pmiSvc?.direction ?? "na",
      vintage: fmtVintage(pmiSvc?.source?.asOf),
      history: pmiSvc?.history12m.map((h) => h.value) ?? [],
      source: pmiSvc?.source,
    },
  ];
}

function IndicatorRow({ ind }: { ind: IndicatorDef }) {
  const dir = dirStyle(ind.direction);
  const Icon = ind.icon;
  const missing = ind.value === "—";
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", ind.iconBox)} aria-hidden>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate">{ind.label}</span>
          <MetricInfo metric={ind.metricKey} sourceOverride={ind.source} value={ind.value} iconSize="xs" />
        </p>
        <p className="truncate text-xs text-muted-foreground">{ind.sub}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="flex items-center justify-end gap-1.5 text-base font-bold tabular-nums text-foreground">
          {ind.value}
          <span className={cn("text-sm", missing ? "text-muted-foreground" : dir.cls)} aria-hidden>{missing ? "" : dir.arrow}</span>
        </p>
        <p className={cn("text-xs tabular-nums", missing ? "text-muted-foreground" : dir.cls)}>
          {missing ? "N/A" : fmtPp(ind.pp)}
        </p>
        <p className="text-[11px] text-muted-foreground">{ind.vintage ? `as of ${ind.vintage}` : "N/A"}</p>
      </div>
      <div className="hidden shrink-0 sm:block">
        <Sparkline values={ind.history} color={missing ? "#9ca3af" : dir.hex} />
      </div>
    </div>
  );
}

/* ------------------------------- left card --------------------------------- */

function MiniBars({ values, color, width = 120, height = 52 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (!values.length) return null;
  const max = Math.max(...values.map(Math.abs), 1e-9);
  const bw = width / values.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      {values.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / max) * (height - 4));
        return (
          <rect key={i} x={i * bw + bw * 0.18} y={height - 2 - h} width={bw * 0.64} height={h} rx={1.5} fill={color} opacity={0.55 + 0.45 * (Math.abs(v) / max)} />
        );
      })}
    </svg>
  );
}

function IndiaMacroIndicators({ data }: { data: IndiaDashboardPayload }) {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const indicators = useMemo(() => buildIndicators(data), [data]);
  const visible = filter === "all" ? indicators : indicators.filter((i) => i.category === filter);
  const liq = data.rbiLiquidity.systemLiquidity;
  const fx = data.rbiLiquidity.fxReserves;
  const liqPositive = (liq.netCr ?? 0) >= 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="India macro indicators">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400" aria-hidden>
            <Globe2 className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">India Macro Indicators</h2>
            <p className="text-sm text-muted-foreground">Key economic indicators and latest available data.</p>
          </div>
        </div>
        <Link
          href="/macro"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          Explore Macro <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Indicator categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors touch-manipulation",
              filter === c.id
                ? "bg-blue-600 text-white"
                : "border border-border text-muted-foreground hover:border-blue-300 hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-2 divide-y divide-border/50">
        {visible.map((ind) => (
          <IndicatorRow key={ind.id} ind={ind} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400" aria-hidden>
                <Droplets className="size-4" />
              </span>
              Net Liquidity
            </p>
            <MetricInfo metric="liquidity" sourceOverride={liq.source} value={liq.value ?? undefined} iconSize="xs" />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground">{liq.value ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{liq.value ? (liqPositive ? "absorbed (surplus)" : "injected (deficit)") : ""}</p>
              {liq.change7d ? <p className="mt-0.5 text-sm font-medium tabular-nums text-emerald-500">+{liq.change7d} (7D)</p> : null}
            </div>
            <MiniBars values={(liq.daily ?? []).slice(-14).map((d) => d.valueCr)} color="#10b981" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400" aria-hidden>
                <Database className="size-4" />
              </span>
              FX Reserves
            </p>
            <MetricInfo metric="fx_reserves" sourceOverride={fx?.source} value={fx?.value ?? undefined} iconSize="xs" />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground">{fx?.value ? `$${fx.value.replace(/[^0-9.]/g, "")} B` : "—"}</p>
              <p className="text-sm text-muted-foreground">(excl. gold)</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fx?.asOf ? `IMF/FRED, monthly · as of ${fx.asOf.slice(0, 7)}` : ""}
              </p>
            </div>
            <MiniBars values={(fx?.history ?? []).map((h) => h.value)} color="#3b82f6" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3.5">
        {[
          { label: "GDP", href: "/macro/india", Icon: TrendingUp },
          { label: "Inflation", href: "/macro/india", Icon: BarChart3 },
          { label: "RBI Policy", href: "/macro/rbi", Icon: Landmark },
          { label: "Calendar", href: "#calendar", Icon: CalendarDays },
        ].map(({ label, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-blue-300 hover:text-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- RBI watch --------------------------------- */

function RateMiniCard({
  label,
  metricKey,
  value,
  pp,
  direction,
  history,
  source,
}: {
  label: string;
  metricKey: string;
  value: string | null;
  pp: number | null;
  direction: MacroRow["direction"];
  history: number[];
  source?: FieldSource;
}) {
  const dir = dirStyle(direction);
  const missing = value == null;
  return (
    <div className="rounded-2xl border border-border/70 p-3.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        <MetricInfo metric={metricKey} sourceOverride={source} value={value ?? undefined} iconSize="xs" />
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div>
          <p className="text-xl font-bold tabular-nums text-foreground">{value ?? "—"}</p>
          <p className={cn("mt-0.5 flex items-center gap-1 text-xs tabular-nums", missing || pp == null ? "text-muted-foreground" : dir.cls)}>
            {missing || pp == null ? (
              "—"
            ) : (
              <>
                <span aria-hidden>{dir.arrow}</span> {fmtPp(pp)}
              </>
            )}
          </p>
        </div>
        {history.length > 1 ? <Sparkline values={history} color={dir.hex} width={96} height={40} /> : null}
      </div>
    </div>
  );
}

function RbiLiquidityWatch({ data }: { data: IndiaDashboardPayload }) {
  const { rbiLiquidity, indiaMacro, pulse } = data;
  const corridor = rbiLiquidity.corridor;
  const repoRow = indiaMacro.find((m) => m.id.toLowerCase().includes("repo"));
  const gsecRow = rbiLiquidity.rows.find((r) => r.label.includes("10Y"));
  const gsec = pulse?.gsec10y;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="RBI liquidity watch">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400" aria-hidden>
            <Landmark className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">RBI / Liquidity watch</h2>
            <p className="text-sm text-muted-foreground">Published rates &amp; yields where available from open APIs.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <MetricInfo metric="liquidity" iconSize="xs" />
          <Link href="/macro/rbi" aria-label="RBI policy page" className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <MoreVertical className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <RateMiniCard
          label="RBI Policy Repo Rate"
          metricKey="repo"
          value={corridor?.repo ?? null}
          pp={repoRow?.current != null && repoRow?.previous != null ? repoRow.current - repoRow.previous : null}
          direction={repoRow?.direction ?? "na"}
          history={repoRow?.history12m.map((h) => h.value) ?? []}
          source={repoRow?.source}
        />
        <RateMiniCard
          label="Cash Reserve Ratio (CRR)"
          metricKey="crr"
          value={corridor?.crr ?? null}
          pp={null}
          direction="na"
          history={[]}
        />
        <RateMiniCard
          label="Standing Deposit Facility (SDF)"
          metricKey="sdf"
          value={corridor?.sdf ?? null}
          pp={null}
          direction="na"
          history={[]}
        />
        <RateMiniCard
          label="10Y G-Sec (live)"
          metricKey="gsec10y"
          value={gsecRow?.value ?? (gsec?.value != null ? `${gsec.value.toFixed(2)}%` : null)}
          pp={gsec?.change ?? null}
          direction={gsec?.change != null ? (gsec.change > 0.0001 ? "up" : gsec.change < -0.0001 ? "down" : "flat") : "na"}
          history={gsecRow?.history?.map((h) => h.value) ?? []}
          source={gsecRow?.source ?? gsec?.source}
        />
      </div>
    </section>
  );
}

/* ---------------------------- system liquidity ----------------------------- */

function LiquidityBars({ daily, range }: { daily: { date: string; valueCr: number }[]; range: 7 | 30 }) {
  const pts = daily.slice(-range);
  const W = 560, H = 190, PL = 34, PR = 8, PT = 8, PB = 30;
  const vals = pts.map((p) => p.valueCr / 1e5); // ₹ L Cr
  if (!pts.length) return <p className="py-8 text-center text-sm text-muted-foreground">No daily liquidity history available yet.</p>;
  const maxAbs = Math.max(...vals.map((v) => Math.abs(v)), 1e-9);
  const yMax = Math.ceil(maxAbs / 4) * 4 || 4;
  const y = (v: number) => PT + (1 - (v + yMax) / (2 * yMax)) * (H - PT - PB);
  const bw = (W - PL - PR) / pts.length;
  const ticks = [-yMax, 0, yMax];
  const labelEvery = Math.max(1, Math.ceil(pts.length / 6));
  const fmtDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso.slice(5) : d.toLocaleDateString("en-IN", { month: "short", day: "2-digit" });
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Daily net liquidity, last ${range} days`} className="h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth="1" />
          <text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" className="fill-muted-foreground">{t}</text>
        </g>
      ))}
      <text x={10} y={PT + 8} fontSize="10" className="fill-muted-foreground" transform={`rotate(-90 10 ${PT + 8})`} textAnchor="end">₹ L Cr</text>
      {pts.map((p, i) => {
        const v = vals[i]!;
        const top = Math.min(y(v), y(0));
        const h = Math.abs(y(v) - y(0));
        return (
          <g key={p.date}>
            <rect x={PL + i * bw + bw * 0.2} y={top} width={bw * 0.6} height={Math.max(1.5, h)} rx={1.5} fill="#2563eb" opacity={0.85}>
              <title>{p.date}: ₹{trimNum(v)} L Cr</title>
            </rect>
            {i % labelEvery === 0 ? (
              <text x={PL + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" className="fill-muted-foreground">{fmtDate(p.date)}</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function SystemLiquidity({ data }: { data: IndiaDashboardPayload }) {
  const [range, setRange] = useState<7 | 30>(7);
  const liq = data.rbiLiquidity.systemLiquidity;
  const positive = (liq.netCr ?? 0) >= 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="System liquidity">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground">System liquidity</h2>
          <p className="text-sm text-muted-foreground">Net liquidity in banking system (RBI DBIE).</p>
        </div>
        <label className="relative inline-flex items-center">
          <span className="sr-only">Chart range</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value === "30" ? 30 : 7)}
            className="appearance-none rounded-full border border-border bg-card py-1.5 pl-3 pr-8 text-sm font-medium touch-manipulation"
          >
            <option value={7}>7D</option>
            <option value={30}>30D</option>
          </select>
          <CalendarDays className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" aria-hidden />
        </label>
      </div>

      {liq.value ? (
        <>
          <p className="mt-3 font-heading text-3xl font-bold tabular-nums text-foreground">{liq.value}</p>
          <p className="text-sm text-muted-foreground">{positive ? "absorbed (surplus)" : "injected (deficit)"}</p>
          {liq.change7d ? (
            <p className="mt-1 text-sm font-medium tabular-nums text-emerald-500">+{liq.change7d} vs. previous 7D</p>
          ) : null}
          <div className="mt-2">
            <LiquidityBars daily={liq.daily ?? []} range={range} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Source: RBI Money Market Operations{liq.source.asOf ? ` · as of ${liq.source.asOf.slice(0, 10)}` : ""}. Bars show net absorption (+) / injection (−) per day.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          RBI's Money Market Operations page could not be reached just now — no figure is shown rather than an estimate.
        </p>
      )}
    </section>
  );
}

/* ------------------------------ key takeaways ------------------------------ */

function KeyTakeaways({ data }: { data: IndiaDashboardPayload }) {
  const rows = data.indiaMacro ?? [];
  const cpi = rows.find((m) => m.id.toLowerCase().includes("cpi"));
  const repo = data.rbiLiquidity.corridor?.repo;
  const liq = data.rbiLiquidity.systemLiquidity;
  const gsec = data.pulse?.gsec10y;

  const bullets: string[] = [];
  if (repo) bullets.push(`RBI policy repo rate stands at ${repo}.`);
  if (liq.value) {
    const dir = (liq.netCr ?? 0) >= 0 ? "surplus" : "deficit";
    bullets.push(
      `System liquidity is in ${dir} at ${liq.value}${liq.change7d ? `, ${liq.change7d} over the last 7 days` : ""}.`,
    );
  }
  if (cpi?.current != null) {
    bullets.push(
      cpi.current <= 6
        ? `CPI inflation at ${cpi.current.toFixed(2)}% remains within RBI's 2–6% tolerance band.`
        : `CPI inflation at ${cpi.current.toFixed(2)}% is above RBI's 6% upper tolerance.`,
    );
  }
  if (gsec?.value != null) {
    const stable = gsec.change == null || Math.abs(gsec.change) < 0.005;
    bullets.push(`10Y G-Sec yield ${stable ? "stable" : "moved"} at ${gsec.value.toFixed(2)}%.`);
  }
  if (!bullets.length) return null;

  return (
    <section className="rounded-2xl bg-blue-50/70 p-4 dark:bg-blue-950/30 sm:p-5" aria-label="Key takeaways">
      <h2 className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">
        <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600/10" aria-hidden>
          <Sparkles className="size-4" />
        </span>
        Key takeaways
      </h2>
      <ul className="mt-2.5 space-y-1.5 text-sm text-foreground/90">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------- board ---------------------------------- */

export function IndiaMacroBoard({ data }: { data: IndiaDashboardPayload | null }) {
  if (!data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <IndiaMacroIndicators data={data} />
      <div className="space-y-4">
        <RbiLiquidityWatch data={data} />
        <SystemLiquidity data={data} />
        <KeyTakeaways data={data} />
      </div>
    </div>
  );
}
