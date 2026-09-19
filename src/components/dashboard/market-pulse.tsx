"use client";

import { SourceLink } from "@/components/dashboard/source-link";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { fmtChgPct, fmtNum } from "@/lib/format-india";
import { cn } from "@/lib/utils";

export function MarketPulse({ data }: { data: IndiaDashboardPayload }) {
  const { pulse } = data;
  return (
    <section className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Market pulse</h2>
        <span className="text-[10px] text-muted-foreground">
          {new Date(data.fetchedAt).toLocaleTimeString()}
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        <PulseCell label="NIFTY 50" q={pulse.nifty} />
        <PulseCell label="SENSEX" q={pulse.sensex} />
        <PulseCell label="BANK NIFTY" q={pulse.bankNifty} />
        <PulseCell label="INDIA VIX" q={pulse.indiaVix} digits={2} />
        <PulseCell label="USD/INR" q={pulse.usdInr} prefix="₹" />
        <PulseCell label="10Y G-SEC" q={pulse.gsec10y} suffix="%" />
        <PulseCell label="BRENT" q={pulse.brent} prefix="$" />
        <PulseCell label="GOLD" q={pulse.gold} prefix="$" />
      </div>
      <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
        <BreadthBlock breadth={pulse.breadth} />
      </div>
    </section>
  );
}

function PulseCell({
  label,
  q,
  prefix = "",
  suffix = "",
  digits = 2,
}: {
  label: string;
  q: IndiaDashboardPayload["pulse"]["nifty"];
  prefix?: string;
  suffix?: string;
  digits?: number;
}) {
  const up = (q.changePct ?? 0) >= 0;
  return (
    <div className="rounded-md border border-border/80 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-lg tabular-nums">
        {prefix}
        {fmtNum(q.value, digits)}
        {suffix}
      </p>
      <p className={cn("font-mono text-xs", up ? "text-emerald-400" : "text-rose-400")}>
        {fmtChgPct(q.changePct ?? null)}
      </p>
      <SourceLink source={q.source} />
    </div>
  );
}

function BreadthBlock({ breadth }: { breadth: IndiaDashboardPayload["pulse"]["breadth"] }) {
  const max = Math.max(breadth.advances ?? 0, breadth.declines ?? 0, 1);
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Market breadth</p>
      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
        <span>Advances {breadth.advances ?? "—"}</span>
        <span>Declines {breadth.declines ?? "—"}</span>
        <span>Unchanged {breadth.unchanged ?? "—"}</span>
        <span>52W high {breadth.high52w ?? "—"}</span>
        <span>52W low {breadth.low52w ?? "—"}</span>
      </div>
      {breadth.advances != null && breadth.declines != null ? (
        <div className="mt-3 space-y-2">
          <Bar label="ADVANCES" value={breadth.advances} max={max} color="#3dd68c" />
          <Bar label="DECLINES" value={breadth.declines} max={max} color="#f07178" />
        </div>
      ) : null}
      <SourceLink source={breadth.source} className="mt-2 inline-block text-[10px] text-primary" />
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const w = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
        <div className="h-full rounded" style={{ width: `${w}%`, background: color }} />
      </div>
      <span>{value.toLocaleString("en-IN")}</span>
    </div>
  );
}
