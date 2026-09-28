"use client";

import { Panel } from "@/components/layout/page-header";
import type { FreeGlobalFeedsPayload } from "@/lib/worldmonitor/free-global-feeds";
import { worldMonitorExternalUrl } from "@/lib/worldmonitor/public-url";
import { cn } from "@/lib/utils";
import Link from "next/link";
import useSWR from "swr";
import { ExternalLink } from "lucide-react";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<FreeGlobalFeedsPayload>);

function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = n * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function WorldMonitorFreeDashboard() {
  const { data, error, isLoading, mutate } = useSWR("/api/worldmonitor/global-feeds", fetcher, {
    refreshInterval: 120_000,
  });

  if (error) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-sm text-rose-600">
        Could not load global feeds.{" "}
        <button type="button" className="font-semibold text-blue-600 underline" onClick={() => mutate()}>
          Retry
        </button>
      </p>
    );
  }

  const globalIndices = (data?.indices.indices ?? []).filter((i) => i.category !== "india").slice(0, 14);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Live from free RSS and public market feeds (BBC, Google News, Yahoo, FRED CSV). Refreshed{" "}
          {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : "…"}.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => mutate()}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-blue-600/40"
          >
            Refresh
          </button>
          <a
            href={worldMonitorExternalUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Full World Monitor map
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Markets" subtitle="Global indices via Yahoo Finance">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading quotes…</p>
          ) : (
            <ul className="divide-y divide-border">
              {globalIndices.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={row.href} className="font-medium text-foreground hover:text-blue-600">
                    {row.label}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {row.price != null ? row.price.toLocaleString(undefined, { maximumFractionDigits: row.decimals }) : "—"}{" "}
                    <span
                      className={cn(
                        row.changePct != null && row.changePct >= 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {pct(row.changePct)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Macro stress" subtitle="FRED public CSV (no API key)">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading macro…</p>
          ) : (
            <ul className="divide-y divide-border">
              {data?.macro.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{s.name}</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {s.latest != null ? `${s.latest.toFixed(2)} ${s.unit}` : "—"}
                    {s.date ? <span className="ml-2 text-xs text-muted-foreground">{s.date}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Earnings calendar" subtitle={data?.earnings.source ?? "Yahoo calendar"}>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {(data?.earnings.items ?? []).slice(0, 12).map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <a href={e.sourceUrl} className="font-medium text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                    {e.symbol}
                  </a>{" "}
                  <span className="text-muted-foreground">
                    {e.company} · {e.period} · {e.date}
                  </span>
                </li>
              ))}
              {(data?.earnings.items.length ?? 0) === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">No upcoming earnings in window.</li>
              ) : null}
            </ul>
          )}
        </Panel>

        <Panel title="Liquidity shifts" subtitle="India macro & flows (MI feeds)">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading shifts…</p>
          ) : (
            <ul className="divide-y divide-border">
              {(data?.liquidity.items ?? []).slice(0, 6).map((item) => (
                <li key={item.id} className="py-2 text-sm">
                  <p className="font-medium text-foreground">{item.headline}</p>
                  <p className="text-muted-foreground">{item.dataSummary}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Global intelligence news" subtitle="RSS — BBC & Google News topics">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading headlines…</p>
        ) : (
          <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
            {(data?.news ?? []).map((n) => (
              <li key={n.id} className="py-2.5">
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium leading-snug text-foreground hover:text-blue-600"
                >
                  {n.title}
                </a>
                {n.publishedAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.publishedAt).toLocaleString()}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
