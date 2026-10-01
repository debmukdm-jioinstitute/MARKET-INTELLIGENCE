"use client";

import { ConsensusBar, type ResearchReportRow } from "@/components/research/research-reports-table";
import { RESEARCH_SOURCE_LABELS } from "@/lib/research/source-labels";
import { cn } from "@/lib/utils";
import { Calendar, Download, ExternalLink, TrendingUp } from "lucide-react";
import Link from "next/link";

const SOURCE_LABELS = RESEARCH_SOURCE_LABELS;

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtPrice(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "—";
  return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`;
}

export function ResearchReportCard({ r }: { r: ResearchReportRow }) {
  const reco = r.recommendation?.toUpperCase();
  const hasDirectPdf = Boolean(r.pdf_url || r.url?.toLowerCase().endsWith(".pdf"));
  const effectivePdfUrl = r.pdf_url || (r.url?.toLowerCase().endsWith(".pdf") ? r.url : null);
  const upside =
    r.upside_pct ?? (r.target_price && r.cmp ? ((r.target_price - r.cmp) / r.cmp) * 100 : null);

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:shadow-md hover:bg-card">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {r.broker ? (
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {r.broker}
              </span>
            ) : null}

            {r.report_type ? (
              <span className="rounded-md bg-accent/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {r.report_type}
              </span>
            ) : (
              <span className="rounded-md bg-accent/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {SOURCE_LABELS[r.source] ?? r.source}
              </span>
            )}

            {reco ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase",
                  reco === "BUY" && "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600",
                  reco === "ACCUMULATE" && "border border-sky-500/30 bg-sky-500/15 text-sky-600",
                  reco === "HOLD" && "border border-amber-500/30 bg-amber-500/15 text-amber-600",
                  reco === "SELL" && "border border-rose-500/30 bg-rose-500/15 text-rose-600",
                )}
              >
                {reco}
              </span>
            ) : null}
          </div>

          <span
            className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground"
            title={r.published_at ? fmtDate(r.published_at) : undefined}
          >
            <Calendar className="size-3 opacity-60" />
            {timeAgo(r.published_at ?? r.scraped_at)}
          </span>
        </div>

        <div>
          {r.symbol ? (
            <Link
              href={`/research/${encodeURIComponent(r.symbol)}`}
              className="mb-1 inline-block text-xs font-bold uppercase tracking-wider text-primary hover:underline"
            >
              {r.symbol} →
            </Link>
          ) : null}
          <h3 className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {r.title}
          </h3>
        </div>

        {r.target_price || upside !== null ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-1 text-xs">
            {r.target_price ? (
              <div className="rounded bg-accent/40 px-2 py-1">
                <span className="text-muted-foreground">Target: </span>
                <span className="font-bold tabular-nums text-foreground">{fmtPrice(r.target_price)}</span>
              </div>
            ) : null}

            {r.cmp ? (
              <div className="rounded bg-accent/40 px-2 py-1">
                <span className="text-muted-foreground">CMP: </span>
                <span className="font-medium tabular-nums text-foreground">{fmtPrice(r.cmp)}</span>
              </div>
            ) : null}

            {upside !== null && Number.isFinite(upside) ? (
              <div
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 font-bold tabular-nums",
                  upside >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
                )}
              >
                <TrendingUp className="size-3" />
                {upside >= 0 ? "+" : ""}
                {upside.toFixed(1)}% Upside
              </div>
            ) : null}
          </div>
        ) : null}

        {r.consensus ? <ConsensusBar consensus={r.consensus} /> : null}

        {r.summary ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{r.summary}</p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        {hasDirectPdf && effectivePdfUrl ? (
          <a
            href={effectivePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
          >
            <Download className="size-3.5" />
            Download PDF
          </a>
        ) : (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Read note <ExternalLink className="size-3" />
          </a>
        )}

        {r.symbol ? (
          <Link
            href={`/research/${encodeURIComponent(r.symbol)}`}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Company dossier →
          </Link>
        ) : (
          <span className="text-[11px] text-muted-foreground">Source: {SOURCE_LABELS[r.source] ?? r.source}</span>
        )}
      </div>
    </div>
  );
}
