"use client";

import { RESEARCH_SOURCE_LABELS } from "@/lib/research/source-labels";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { signClass } from "@/lib/sign-color";

export type ResearchReportRow = {
  id: string;
  source: string;
  broker: string | null;
  title: string;
  url: string;
  pdf_url?: string | null;
  symbol?: string | null;
  recommendation?: string | null;
  target_price?: number | null;
  cmp?: number | null;
  upside_pct?: number | null;
  report_type?: string | null;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
  consensus?: {
    apply: number;
    mayApply: number;
    neutral: number;
    avoid: number;
    notRated: number;
  } | null;
};

function fmtPrice(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "—";
  return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`;
}

export function ConsensusBar({
  consensus,
}: {
  consensus: NonNullable<ResearchReportRow["consensus"]>;
}) {
  const total = consensus.apply + consensus.mayApply + consensus.neutral + consensus.avoid + consensus.notRated;
  if (total <= 0) return null;
  const segments = [
    { label: "Apply", n: consensus.apply, cls: "bg-emerald-500" },
    { label: "May", n: consensus.mayApply, cls: "bg-sky-500" },
    { label: "Neutral", n: consensus.neutral, cls: "bg-amber-400" },
    { label: "Avoid", n: consensus.avoid, cls: "bg-rose-500" },
  ];
  return (
    <div className="space-y-1">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((s) =>
          s.n > 0 ? (
            <div key={s.label} className={cn(s.cls, "h-full")} style={{ width: `${(s.n / total) * 100}%` }} title={`${s.label}: ${s.n}`} />
          ) : null,
        )}
      </div>
      <p className="text-[10px] text-muted-foreground tabular-nums">
        Apply {consensus.apply} · May {consensus.mayApply} · Neutral {consensus.neutral} · Avoid {consensus.avoid}
      </p>
    </div>
  );
}

export function ResearchReportsTable({ rows }: { rows: ResearchReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Broker</th>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Reco</th>
            <th className="px-3 py-2 text-right">Target</th>
            <th className="px-3 py-2 text-right">Upside</th>
            <th className="px-3 py-2">Published</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id || r.url} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
              <td className="px-3 py-2 text-xs text-muted-foreground">{RESEARCH_SOURCE_LABELS[r.source] ?? r.source}</td>
              <td className="px-3 py-2 text-xs">{r.broker ?? "—"}</td>
              <td className="px-3 py-2 text-xs font-semibold">
                {r.symbol ? (
                  <Link href={`/research/${encodeURIComponent(r.symbol)}`} className="text-primary hover:underline">
                    {r.symbol}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="max-w-xs px-3 py-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:text-primary">
                  {r.title}
                </a>
                {r.consensus ? (
                  <div className="mt-1 max-w-md">
                    <ConsensusBar consensus={r.consensus} />
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-xs font-bold">{r.recommendation ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtPrice(r.target_price)}</td>
              <td className={cn("px-3 py-2 text-right tabular-nums", signClass(r.upside_pct))}>
                {r.upside_pct != null ? `${r.upside_pct >= 0 ? "+" : ""}${r.upside_pct.toFixed(1)}%` : "—"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {r.published_at ? new Date(r.published_at).toLocaleDateString("en-IN") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
