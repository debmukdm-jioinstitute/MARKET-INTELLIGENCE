"use client";

import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { ExternalLink, FileSearch, Radio, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Report = {
  id: string;
  source: string;
  broker: string | null;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
};

type BrokerCount = { broker: string; count: number };

const SOURCE_LABELS: Record<string, string> = {
  et_recos: "Economic Times",
  livemint_recos: "LiveMint",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ResearchReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [brokers, setBrokers] = useState<BrokerCount[]>([]);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeBroker, setActiveBroker] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (activeBroker) params.set("broker", activeBroker);
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/research-reports?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setReports(json.reports ?? []);
        setBrokers(json.brokers ?? []);
        setLastScrapedAt(json.lastScrapedAt ?? null);
        setDbConfigured(json.dbConfigured !== false);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeBroker, query]);

  const brokerChips = useMemo(() => brokers.slice(0, 14), [brokers]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      <PageHeader
        kicker="Research Desk"
        title="Research Reports"
        subtitle="Latest broker and research-house calls, auto-ingested continuously from public research feeds — no manual curation."
      />

      {!dbConfigured ? (
        <div className="rounded-lg border border-blue-600/30 bg-blue-600/5 p-3 text-sm text-blue-600">
          No database configured — the research feed needs DATABASE_URL / POSTGRES_URL set to store scraped reports.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/90 bg-card p-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FileSearch className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">
              Auto-updating feed
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Radio className="size-3 text-emerald-600 animate-pulse" />
              Last refreshed {timeAgo(lastScrapedAt)}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or broker..."
            className="w-64 rounded-lg border border-border bg-accent/20 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {brokerChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveBroker(null)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              activeBroker === null
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            ALL
          </button>
          {brokerChips.map((b) => (
            <button
              key={b.broker}
              type="button"
              onClick={() => setActiveBroker(b.broker)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                activeBroker === b.broker
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {b.broker} <span className="opacity-60">({b.count})</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {loading && reports.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            Ingesting latest broker research…
          </p>
        ) : reports.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No reports match this filter yet — the feed refreshes automatically.
          </p>
        ) : (
          reports.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-xl border border-border/90 bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/20"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.broker ? (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-sm font-bold text-primary">
                      {r.broker}
                    </span>
                  ) : null}
                  <span className="rounded bg-accent/50 px-1.5 py-0.5 text-sm text-muted-foreground">
                    {SOURCE_LABELS[r.source] ?? r.source}
                  </span>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {timeAgo(r.published_at ?? r.scraped_at)}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                {r.title}
              </h3>
              {r.summary ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
              ) : null}
              <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Read full report <ExternalLink className="size-3" />
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
