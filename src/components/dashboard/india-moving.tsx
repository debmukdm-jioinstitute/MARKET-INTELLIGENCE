"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { SourceLink } from "@/components/dashboard/source-link";
import type { FoSnapshot, IndexSnapshot, IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { fmtChgPct, fmtNum } from "@/lib/format-india";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function IndiaMoving({ data }: { data: IndiaDashboardPayload }) {
  const { indiaMoving } = data;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold">What is moving India?</h2>
        <p className="text-sm text-muted-foreground">Indian market snapshot — live indices, volatility, breadth, F&amp;O.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <IndexPanel snap={indiaMoving.nifty} />
        <IndexPanel snap={indiaMoving.bankNifty} />
        <VixPanel snap={indiaMoving.indiaVix} breadth={indiaMoving.breadth} />
      </div>
      <FoTeaser fo={indiaMoving.fo} />
    </section>
  );
}

function IndexPanel({ snap }: { snap: IndexSnapshot }) {
  const chart = (snap.history1m ?? []).map((p) => ({ date: p.date.slice(5), px: p.value }));
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-mono text-sm font-semibold">{snap.name}</h3>
        <SourceLink source={snap.current.source} />
      </div>
      <p className="mt-1 font-mono text-2xl tabular-nums">{fmtNum(snap.current.value)}</p>
      <p className={cn("font-mono text-sm", (snap.change1d ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
        {fmtChgPct(snap.change1d ?? null)} 1D
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-1 font-mono text-[11px]">
        <Stat k="Intraday H" v={fmtNum(snap.high)} />
        <Stat k="Intraday L" v={fmtNum(snap.low)} />
        <Stat k="1W" v={fmtChgPct(snap.change1w)} />
        <Stat k="1M" v={fmtChgPct(snap.change1m)} />
        <Stat k="YTD" v={fmtChgPct(snap.changeYtd)} />
      </dl>
      {chart.length > 1 ? (
        <div className="mt-3 h-[100px]">
          <Lines data={chart} keys={[{ key: "px", color: "#ff9f0a", name: snap.symbol }]} />
        </div>
      ) : null}
    </div>
  );
}

function VixPanel({
  snap,
  breadth,
}: {
  snap: IndexSnapshot;
  breadth: IndiaDashboardPayload["indiaMoving"]["breadth"];
}) {
  const hist = snap.history1m ?? [];
  const lows = hist.map((p) => p.value);
  const range1m = lows.length ? { min: Math.min(...lows), max: Math.max(...lows) } : null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-mono text-sm font-semibold">INDIA VIX</h3>
      <p className="mt-1 font-mono text-2xl">{fmtNum(snap.current.value, 2)}</p>
      <p className="font-mono text-xs text-muted-foreground">Daily {fmtChgPct(snap.change1d ?? null)}</p>
      {range1m ? (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          1M range {fmtNum(range1m.min, 2)} – {fmtNum(range1m.max, 2)}
        </p>
      ) : null}
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Market breadth</p>
      <p className="font-mono text-[11px]">
        Adv {breadth.advances ?? "—"} · Dec {breadth.declines ?? "—"}
      </p>
      <SourceLink source={snap.current.source} className="mt-2 inline-block" />
    </div>
  );
}

function FoTeaser({ fo }: { fo: { nifty: FoSnapshot; bankNifty: FoSnapshot } }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">F&amp;O positioning (summary)</h3>
        <Link href="/derivatives" className="text-xs text-primary hover:underline">
          Open full derivatives dashboard →
        </Link>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <FoCard title="NIFTY" row={fo.nifty} />
        <FoCard title="BANK NIFTY" row={fo.bankNifty} />
      </div>
    </div>
  );
}

function FoCard({ title, row }: { title: string; row: FoSnapshot }) {
  return (
    <div className="rounded-md border border-border/80 p-3">
      <p className="font-mono text-xs font-semibold">{title}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]">
        <Stat k="PCR" v={row.pcr != null ? row.pcr.toFixed(2) : "—"} />
        <Stat k="Total OI" v={row.totalOi != null ? row.totalOi.toLocaleString("en-IN") : "—"} />
        <Stat k="Δ OI" v={row.changeOi != null ? row.changeOi.toLocaleString("en-IN") : "—"} />
        <Stat k="Max pain" v={row.maxPain != null ? fmtNum(row.maxPain, 0) : "—"} />
      </dl>
      <SourceLink source={row.source} className="mt-2 inline-block" />
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
