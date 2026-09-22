"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Analytics = { daily: { day: string; n: number }[]; topPaths: { path: string; n: number }[]; uniqueVisitors7d: number };

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.n) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">Analytics</p>
        <h1 className="mt-1 text-xl font-semibold">Traffic</h1>
        <p className="mt-1 text-sm text-neutral-500">Pageview beacons fired by every page in the main app (logged-in and guest).</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <AdminStat label="Pageviews (14d)" value={data?.daily.reduce((s, d) => s + d.n, 0) ?? "—"} />
        <AdminStat label="Unique signed-in visitors (7d)" value={data?.uniqueVisitors7d ?? "—"} />
        <AdminStat label="Distinct pages (7d)" value={data?.topPaths.length ?? "—"} />
      </div>

      <AdminCard title="Daily pageviews (14 days)">
        <div className="flex h-40 items-end gap-1">
          {(data?.daily ?? []).map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-amber-400/70"
                style={{ height: `${Math.max(4, (d.n / maxDaily) * 140)}px` }}
                title={`${d.day}: ${d.n}`}
              />
              <span className="text-[9px] text-neutral-600">{d.day.slice(5)}</span>
            </div>
          ))}
          {data && data.daily.length === 0 ? <p className="text-sm text-neutral-500">No traffic recorded yet.</p> : null}
        </div>
      </AdminCard>

      <AdminCard title="Top pages (7 days)">
        <div className="space-y-1">
          {(data?.topPaths ?? []).map((p) => (
            <div key={p.path} className="flex items-center justify-between border-b border-neutral-900 py-1.5 text-sm">
              <span className="truncate font-mono text-xs text-neutral-300">{p.path}</span>
              <span className="tabular-nums text-neutral-500">{p.n}</span>
            </div>
          ))}
          {data && data.topPaths.length === 0 ? <p className="text-sm text-neutral-500">No traffic recorded yet.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
