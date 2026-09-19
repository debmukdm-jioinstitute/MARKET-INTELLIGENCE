"use client";

import { SourceLink } from "@/components/dashboard/source-link";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

export function RbiLiquidity({ data }: { data: IndiaDashboardPayload }) {
  const { rbiLiquidity } = data;
  const liq = rbiLiquidity.systemLiquidity;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">RBI / liquidity watch</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Published rates &amp; yields where available from open APIs. System liquidity requires RBI DBIE — shown only when
        sourced.
      </p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {rbiLiquidity.rows.map((row) => (
          <div key={row.label} className="flex justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-mono">{row.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-md border border-dashed border-border p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">System liquidity</p>
        <p className="mt-1 font-mono text-lg">{liq.value ?? "—"}</p>
        <p className="text-xs text-muted-foreground">7D change: {liq.change7d ?? "—"}</p>
        {liq.trend30d.length > 0 ? (
          <div className="mt-2 flex h-2 gap-0.5">
            {liq.trend30d.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm bg-primary/60" style={{ opacity: 0.3 + v * 0.7 }} />
            ))}
          </div>
        ) : null}
        <SourceLink source={liq.source} className="mt-2 inline-block" />
      </div>
    </section>
  );
}
