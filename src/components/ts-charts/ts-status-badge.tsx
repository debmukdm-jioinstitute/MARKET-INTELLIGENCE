"use client";
import useSWR from "swr";

type Row = { dataset: string; latest_obs: string | null; state: "current" | "behind" | "failing" | null; expected_lag_days: number; last_run: string | null; last_error?: string | null };
const load = (u: string): Promise<Row[]> => fetch(u).then((r) => (r.ok ? r.json() : []));
export const useTsStatus = () => useSWR<Row[]>("/api/ts/status", load, { revalidateOnFocus: false });

/** Compact freshness badge: how many datasets are current. Renders nothing until data exists (no fake "all good"). */
export function TsStatusBadge() {
  const { data } = useTsStatus();
  if (!Array.isArray(data) || !data.length) return null;
  const cur = data.filter((d) => d.state === "current").length;
  const bad = data.some((d) => d.state === "failing");
  return (
    <a href="/data?section=sources" className="inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: bad ? "var(--critical)" : cur === data.length ? "var(--good)" : "var(--s5)" }} />
      {cur}/{data.length} datasets current
    </a>
  );
}

export function TsStatusTable() {
  const { data, isLoading } = useTsStatus();
  if (isLoading) return <p className="text-sm" style={{ color: "var(--ink-3)" }}>Loading…</p>;
  if (!Array.isArray(data) || !data.length) return <p className="text-sm" style={{ color: "var(--ink-3)" }}>No datasets have reported yet.</p>;
  const tone = { current: "var(--good)", behind: "var(--s5)", failing: "var(--critical)" } as const;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm tabular-nums" style={{ color: "var(--ink)" }}>
        <thead><tr className="text-left" style={{ color: "var(--ink-3)" }}><th className="py-2 pr-3">Dataset</th><th className="pr-3">Latest observation</th><th className="pr-3">Expected lag</th><th className="pr-3">Last run</th><th>State</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.dataset} className="border-t" style={{ borderColor: "var(--rule)" }}>
              <td className="py-2 pr-3">{d.dataset}</td>
              <td className="pr-3">{d.latest_obs ?? "–"}</td>
              <td className="pr-3">{d.expected_lag_days}d</td>
              <td className="pr-3">{d.last_run ? d.last_run.slice(0, 16).replace("T", " ") : "–"}</td>
              <td><span className="rounded px-2 py-0.5 text-xs" style={{ background: "var(--paper-2)", color: d.state ? tone[d.state] : "var(--ink-3)" }} title={d.last_error ?? undefined}>{d.state ?? "unknown"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
