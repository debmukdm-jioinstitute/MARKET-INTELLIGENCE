"use client";
import Link from "next/link";
import useSWR from "swr";
import type { StressResult } from "@/lib/stress/compute";

type Payload = { current: StressResult };
// Module-level loader: stable identity (AGENTS.md "React update loops").
const load = async (url: string): Promise<Payload> => {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

/** Component tags for nesting the one Stress Index (canonical scoreboard lives on Economy #macro-stress). Untagged inputs stay on the macro scoreboard only. */
export const STRESS_TAGS = {
  market: { families: ["volatility", "price", "flows"], exclude: ["us_vix"] },
  global: { ids: ["us_vix", "us10y_1d", "dxy_1d", "brent_1d"] },
} as const;

export function StressSlice({ kind }: { kind: "market" | "global" }) {
  const { data, error, isLoading } = useSWR("/api/stress", load, { refreshInterval: 60_000 });
  const cur = data?.current;
  const rows = (cur?.components ?? []).filter((c) =>
    kind === "market"
      ? (STRESS_TAGS.market.families as readonly string[]).includes(c.family) && !(STRESS_TAGS.market.exclude as readonly string[]).includes(c.id)
      : (STRESS_TAGS.global.ids as readonly string[]).includes(c.id),
  );
  return (
    <div className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Computing from live feeds…</p> : null}
      {error ? <p className="text-sm text-rose-600">Stress inputs unavailable right now.</p> : null}
      {cur && rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Input</th>
                <th className="px-3 py-2 text-right font-semibold">Reading</th>
                <th className="px-3 py-2 text-right font-semibold">Stress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-foreground">{c.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.display}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Math.round(c.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        This is a slice of the India Macro Stress Index{cur?.score != null ? ` (score ${cur.score})` : ""}.{" "}
        <Link href="/economy?section=macro-stress" className="font-medium text-primary underline-offset-2 hover:underline">Open the full scoreboard</Link>
      </p>
    </div>
  );
}
