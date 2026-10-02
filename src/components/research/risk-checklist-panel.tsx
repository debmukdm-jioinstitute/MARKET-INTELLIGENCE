"use client";

import { Panel } from "@/components/layout/page-header";
import type { RiskItem, RiskSeverity } from "@/lib/research/legal-risk";
import { cn } from "@/lib/utils";
import useSWR from "swr";

type LegalRiskResponse = { symbol: string; dbConfigured: boolean; items: RiskItem[]; checked: string[]; notChecked: string[]; ncltUrl: string };

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadLegalRisk(url: string): Promise<LegalRiskResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as LegalRiskResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const CHIP: Record<RiskSeverity, { text: string; cls: string; row: string }> = {
  high: { text: "Look closely", cls: "bg-rose-600 text-white", row: "border-rose-300 bg-rose-50" },
  review: { text: "Worth reading", cls: "bg-amber-500 text-white", row: "border-amber-300 bg-amber-50" },
  info: { text: "FYI", cls: "bg-slate-500 text-white", row: "border-border bg-card" },
};

export function RiskChecklistPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<LegalRiskResponse>(`/api/research/legal-risk?symbol=${encodeURIComponent(symbol)}`, loadLegalRisk, { revalidateOnFocus: false });

  return (
    <Panel
      title="What could go wrong"
      subtitle="A checklist of published warning signs. Each row links the document — we quote titles and never decide what they mean."
      trust={{ source: "SEBI orders, NSE company filings, credit-rating agencies", note: "Published facts only, not legal conclusions or investment advice" }}
    >
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Checking the sources for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load the checklist right now. Try again in a moment.</p> : null}

      {data && !error ? (
        <div className="space-y-4">
          {data.items.length === 0 ? (
            <p className="rounded-md border border-border bg-card p-3 text-sm text-foreground">
              Nothing found for {symbol} in the sources we check. That is <span className="font-semibold">not</span> a clean bill of health — see what we don&apos;t check below.
              {data.dbConfigured ? "" : " (Database not configured on this deployment.)"}
            </p>
          ) : (
            <ul className="space-y-2">
              {data.items.map((i) => (
                <li key={i.id} className={cn("rounded-md border p-3 text-sm", CHIP[i.severity].row)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CHIP[i.severity].cls)}>{CHIP[i.severity].text}</span>
                    <span className="font-semibold text-foreground">{i.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDay(i.date)} · {i.source}
                    </span>
                    {i.link ? (
                      <a href={i.link} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-semibold text-primary hover:underline">
                        Open document ↗
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-1 text-foreground">{i.explanation}</p>
                  {i.quote ? <p className="mt-1 text-xs text-muted-foreground">Title: “{i.quote}”</p> : null}
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="rounded-md bg-muted p-3">
              <p className="mb-1 font-semibold text-foreground">What we check</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {data.checked.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="mb-1 font-semibold text-foreground">What we don&apos;t check</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {data.notChecked.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <a href={data.ncltUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-primary hover:underline">
                Search NCLT orders yourself ↗
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
