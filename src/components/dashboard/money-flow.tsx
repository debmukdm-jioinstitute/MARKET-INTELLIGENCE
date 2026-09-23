"use client";

import { Donut } from "@/components/charts/terminal-charts";
import { DataInfo } from "@/components/feeds/data-info";
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
      <p className="text-sm text-muted-foreground">FII / DII from NSE when the feed responds. Longer windows need historical API.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FlowCard row={moneyFlow.fii} hubSyncedAt={data.fetchedAt} />
        <FlowCard row={moneyFlow.dii} hubSyncedAt={data.fetchedAt} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">FII vs DII (today |net|)</p>
          {fii != null && dii != null ? (
            <div className="mt-2 space-y-2 text-sm">
              <FlowBar label="FII" value={Math.abs(fii)} max={Math.max(Math.abs(fii), Math.abs(dii), 1)} />
              <FlowBar label="DII" value={Math.abs(dii)} max={Math.max(Math.abs(fii), Math.abs(dii), 1)} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
          <span className="mt-2 inline-flex items-center text-sm">
            Source <DataInfo source={moneyFlow.fiiVsDii.source} hubSyncedAt={data.fetchedAt} />
          </span>
        </div>
        {pie.length ? (
          <div className="h-[200px]">
            <Donut data={pie} />
          </div>
        ) : null}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {moneyFlow.extras.map((e) => (
          <li key={e.label}>
            {e.label}: {e.value ?? "—"}
            <DataInfo source={e.source} hubSyncedAt={data.fetchedAt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlowCard({
  row,
  hubSyncedAt,
}: {
  row: IndiaDashboardPayload["moneyFlow"]["fii"];
  hubSyncedAt: string;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-semibold">{row.label}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
        <div className="flex justify-between"><dt>Today</dt><dd>{fmtCr(row.today)}</dd></div>
        <div className="flex justify-between"><dt>5D</dt><dd>{row.d5 != null ? fmtCr(row.d5) : "—"}</dd></div>
        <div className="flex justify-between"><dt>1M</dt><dd>{row.m1 != null ? fmtCr(row.m1) : "—"}</dd></div>
        <div className="flex justify-between"><dt>YTD</dt><dd>{row.ytd != null ? fmtCr(row.ytd) : "—"}</dd></div>
      </dl>
      <span className="mt-2 inline-flex items-center text-sm">
        Source <DataInfo source={row.source} hubSyncedAt={hubSyncedAt} />
      </span>
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
