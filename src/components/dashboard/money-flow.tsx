"use client";

import { Donut } from "@/components/charts/terminal-charts";
import { SourceLink } from "@/components/dashboard/source-link";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { fmtCr } from "@/lib/format-india";

export function MoneyFlow({ data }: { data: IndiaDashboardPayload }) {
  const { moneyFlow } = data;
  const fii = moneyFlow.fii.today;
  const dii = moneyFlow.dii.today;
  const pie =
    fii != null && dii != null && fii + dii !== 0
      ? [
          { name: "FII (net)", value: Math.abs(fii) },
          { name: "DII (net)", value: Math.abs(dii) },
        ]
      : [];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">India money flow</h2>
      <p className="text-xs text-muted-foreground">FII / DII from NSE when the feed responds. Longer windows need historical API.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FlowCard row={moneyFlow.fii} />
        <FlowCard row={moneyFlow.dii} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">FII vs DII (today |net|)</p>
          {fii != null && dii != null ? (
            <div className="mt-2 space-y-2 font-mono text-[11px]">
              <FlowBar label="FII" value={Math.abs(fii)} max={Math.max(Math.abs(fii), Math.abs(dii), 1)} />
              <FlowBar label="DII" value={Math.abs(dii)} max={Math.max(Math.abs(fii), Math.abs(dii), 1)} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
          <SourceLink source={moneyFlow.fiiVsDii.source} className="mt-2 inline-block" />
        </div>
        {pie.length ? (
          <div className="h-[200px]">
            <Donut data={pie} />
          </div>
        ) : null}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {moneyFlow.extras.map((e) => (
          <li key={e.label}>
            {e.label}: {e.value ?? "—"} (<SourceLink source={e.source} />)
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlowCard({ row }: { row: IndiaDashboardPayload["moneyFlow"]["fii"] }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="font-mono text-sm font-semibold">{row.label}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]">
        <div className="flex justify-between"><dt>Today</dt><dd>{fmtCr(row.today)}</dd></div>
        <div className="flex justify-between"><dt>5D</dt><dd>{row.d5 != null ? fmtCr(row.d5) : "—"}</dd></div>
        <div className="flex justify-between"><dt>1M</dt><dd>{row.m1 != null ? fmtCr(row.m1) : "—"}</dd></div>
        <div className="flex justify-between"><dt>YTD</dt><dd>{row.ytd != null ? fmtCr(row.ytd) : "—"}</dd></div>
      </dl>
      <SourceLink source={row.source} className="mt-2 inline-block" />
    </div>
  );
}

function FlowBar({ label, value, max }: { label: string; value: number; max: number }) {
  const w = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-8">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
        <div className="h-full bg-primary" style={{ width: `${w}%` }} />
      </div>
      <span>{fmtCr(value)}</span>
    </div>
  );
}
