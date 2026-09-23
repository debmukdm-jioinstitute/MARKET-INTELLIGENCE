"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { MetricInfo } from "@/components/ui/metric-info";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

export function RbiLiquidity({ data }: { data: IndiaDashboardPayload }) {
  const { rbiLiquidity } = data;
  const liq = rbiLiquidity.systemLiquidity;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-primary">RBI / liquidity watch</h2>
        <MetricInfo id="liquidity" asOf={data.fetchedAt} iconSize="xs" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Published rates &amp; yields where available from open APIs. System liquidity requires RBI DBIE — shown only when
        sourced.
      </p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {rbiLiquidity.rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center rounded-md border border-border/70 px-3 py-2 text-sm">
            <dt className="text-muted-foreground flex items-center gap-1">
              <span>{row.label}</span>
              <MetricInfo
                id={row.label.toLowerCase().includes("repo") ? "repo" : row.label.toLowerCase().includes("reverse") ? "repo" : row.label.toLowerCase().includes("g-sec") ? "gsec10y" : "liquidity"}
                name={row.label}
                asOf={data.fetchedAt}
                iconSize="xs"
              />
            </dt>
            <dd className="">{row.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-md border border-dashed border-border p-3">
        <div className="flex justify-between items-center">
          <p className="text-xs font-semibold uppercase text-muted-foreground">System liquidity</p>
          <MetricInfo id="liquidity" asOf={liq.source.asOf ?? data.fetchedAt} iconSize="xs" />
        </div>
        <p className="mt-1 text-lg">{liq.value ?? "—"}</p>
        <p className="text-sm text-muted-foreground">7D change: {liq.change7d ?? "—"}</p>
        {liq.trend30d.length > 0 ? (
          <div className="mt-2 flex h-2 gap-0.5">
            {liq.trend30d.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm bg-primary/60" style={{ opacity: 0.3 + v * 0.7 }} />
            ))}
          </div>
        ) : null}
        <span className="mt-2 inline-flex items-center gap-1 text-sm">
          Source:
          <MetricInfo
            id="liquidity"
            name="RBI Net Liquidity Absorption / Injection"
            provider={liq.source.provider}
            sourceUrl={liq.source.url}
            asOf={liq.source.asOf ?? data.fetchedAt}
            iconSize="xs"
          />
          <DataInfo source={liq.source} hubSyncedAt={data.fetchedAt} />
        </span>
      </div>
    </section>
  );
}
