"use client";

import useSWR from "swr";
import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import type { InsightCard } from "@/lib/insights/engine";

type InsightsResponse = { symbol: string; cards: InsightCard[] };

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadInsights(url: string): Promise<InsightsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as InsightsResponse;
}

const LEVEL_CLASS = {
  High: "bg-emerald-500/15 text-emerald-700",
  Medium: "bg-amber-500/15 text-amber-700",
  Low: "bg-muted text-muted-foreground",
} as const;

export function InsightCardsPanel({ symbol }: { symbol: string }) {
  const { data } = useSWR<InsightsResponse>(
    `/api/insights?symbol=${encodeURIComponent(symbol)}`,
    loadInsights,
    { revalidateOnFocus: false },
  );
  const cards = data?.cards ?? [];
  if (!cards.length) return null;
  return (
    <Panel title="What changed" subtitle="Each line cites the data it uses. Research only, not investment advice.">
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.id} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{c.headline}</p>
              <Badge className={LEVEL_CLASS[c.confidence.level]} title={c.confidence.drivers.join(" · ")}>
                {c.confidence.level} confidence
              </Badge>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {c.reasons.map((r, i) => (
                <li key={i}>
                  {r.text}{" "}
                  {r.factIds.map((id) => {
                    const f = c.facts.find((x) => x.id === id);
                    if (!f) return null;
                    return f.source.startsWith("http") ? (
                      <a key={id} href={f.source} target="_blank" rel="noopener noreferrer" className="text-primary text-xs">
                        [{f.label}]
                      </a>
                    ) : (
                      <span key={id} className="text-xs">[{f.source}{f.asOf ? `, ${f.asOf.slice(0, 10)}` : ""}]</span>
                    );
                  })}
                </li>
              ))}
            </ul>
            {c.whatWouldChange ? <p className="text-xs text-muted-foreground">What would change this: {c.whatWouldChange}</p> : null}
            <p className="text-xs text-muted-foreground">
              {c.engine === "rules" ? "Rule-written" : "AI-written, fact-checked"} · {new Date(c.generatedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
