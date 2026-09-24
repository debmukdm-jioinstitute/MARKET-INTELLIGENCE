"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import useSWR from "swr";

type Status = "fresh" | "stale" | "failing" | "pending";
type SeriesRow = {
  id: string;
  label: string;
  unit: string;
  category: string;
  provider: string;
  url: string;
  last_ok: string | null;
  last_error: string | null;
  points: number;
  latest_date: string | null;
  status: Status;
};
type Payload = {
  generatedAt: string;
  counts: Record<Status, number>;
  series: SeriesRow[];
  failures: { collector: string; error: string | null; at: string | null }[];
};

const fetcher = async (url: string): Promise<Payload> => {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

const STATUS_STYLE: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  fresh: { label: "Fresh", cls: "text-emerald-600", Icon: CheckCircle2 },
  stale: { label: "Stale", cls: "text-amber-600", Icon: Clock },
  failing: { label: "Failing", cls: "text-rose-600", Icon: XCircle },
  pending: { label: "Pending", cls: "text-muted-foreground", Icon: CircleDashed },
};

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m ago` : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
};

export default function DataHealthPage() {
  const { data, error, isLoading } = useSWR("/api/collector", fetcher, { refreshInterval: 60_000 });
  const categories = data ? [...new Set(data.series.map((s) => s.category))].sort() : [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Data Plane"
        title="Data Health & Provenance"
        subtitle="Every series collected by the scheduled ingestion job (runs every 3 hours): its source, the date of its latest observation, and whether it is fresh, stale or failing. A failed run never overwrites the last good value."
      />

      {isLoading ? <p className="text-sm text-muted-foreground">Loading collector status…</p> : null}
      {error ? <p className="text-sm text-rose-600">Collector status unavailable: {error.message}</p> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(STATUS_STYLE) as Status[]).map((k) => {
              const { label, cls, Icon } = STATUS_STYLE[k];
              return (
                <div key={k} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${cls}`}>
                    <Icon className="size-4" /> {label}
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{data.counts[k]}</p>
                </div>
              );
            })}
          </div>

          {data.failures.length ? (
            <Panel title="Collector errors" subtitle="Last run of these sources failed; previous values are still being served.">
              <ul className="space-y-1.5 text-sm">
                {data.failures.map((f) => (
                  <li key={f.collector} className="flex flex-wrap gap-x-3">
                    <span className="font-semibold text-foreground">{f.collector}</span>
                    <span className="text-rose-600">{f.error}</span>
                    <span className="text-muted-foreground">{ago(f.at)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {categories.map((cat) => (
            <Panel key={cat} title={cat.charAt(0).toUpperCase() + cat.slice(1)}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4 font-semibold">Series</th>
                      <th className="py-2 pr-4 font-semibold">Source</th>
                      <th className="py-2 pr-4 font-semibold">Latest obs.</th>
                      <th className="py-2 pr-4 font-semibold">Last fetched</th>
                      <th className="py-2 pr-4 text-right font-semibold">Points</th>
                      <th className="py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.series.filter((s) => s.category === cat).map((s) => {
                      const { label, cls, Icon } = STATUS_STYLE[s.status];
                      return (
                        <tr key={s.id}>
                          <td className="py-2 pr-4 text-foreground">
                            {s.label} <span className="text-muted-foreground">({s.unit})</span>
                          </td>
                          <td className="py-2 pr-4">
                            <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {s.provider}
                            </a>
                          </td>
                          <td className="py-2 pr-4 tabular-nums text-muted-foreground">{s.latest_date?.slice(0, 10) ?? "—"}</td>
                          <td className="py-2 pr-4 tabular-nums text-muted-foreground">{ago(s.last_ok)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{s.points}</td>
                          <td className={`py-2 font-semibold ${cls}`}>
                            <span className="inline-flex items-center gap-1"><Icon className="size-3.5" /> {label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </>
      ) : null}
    </div>
  );
}
