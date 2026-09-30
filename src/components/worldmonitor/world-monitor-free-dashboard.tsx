"use client";

import { Panel } from "@/components/layout/page-header";
import { DataInfo } from "@/components/feeds/data-info";
import { FeedSourceInfo } from "@/components/feeds/feed-source-info";
import type { FreeGlobalFeedsPayload } from "@/lib/worldmonitor/free-global-feeds";
import { worldMonitorExternalUrl } from "@/lib/worldmonitor/public-url";
import { cn } from "@/lib/utils";
import type { WorldIndexQuote } from "@/lib/macro/build-world-indices";
import type { MarketShiftItem } from "@/lib/feeds/what-changed/types";
import type { NewsItem } from "@/lib/feeds/types";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronRight, ExternalLink, Filter, X } from "lucide-react";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<FreeGlobalFeedsPayload>);

const TOUCH_ROW =
  "flex min-h-11 w-full touch-manipulation items-center gap-2 rounded-lg px-1 text-left transition active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const TOUCH_BTN =
  "inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

type SectionId = "news" | "markets" | "macro" | "liquidity";

const SECTION_LABELS: Record<SectionId, string> = {
  news: "News",
  markets: "Markets",
  macro: "Macro",
  liquidity: "Liquidity",
};

const DEFAULT_SECTIONS: SectionId[] = ["news", "markets", "macro", "liquidity"];

type Detail =
  | { kind: "index"; row: WorldIndexQuote }
  | { kind: "news"; row: NewsItem }
  | { kind: "liquidity"; row: MarketShiftItem }
  | { kind: "macro"; row: { id: string; name: string; unit: string; latest: number | null; date: string | null } };

function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = n * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function DetailDrawer({
  detail,
  onClose,
  hubSyncedAt,
}: {
  detail: Detail | null;
  onClose: () => void;
  hubSyncedAt?: string;
}) {
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close detail"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wm-detail-title"
        className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-lg sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="wm-detail-title" className="font-heading text-lg font-bold text-foreground">
            {detail.kind === "index" && detail.row.label}
            {detail.kind === "news" && "Headline"}
            {detail.kind === "liquidity" && detail.row.headline}
            {detail.kind === "macro" && detail.row.name}
          </h2>
          <button type="button" onClick={onClose} className={cn(TOUCH_BTN, "min-w-11 shrink-0 border border-border")}>
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="space-y-3 text-sm text-foreground">
          {detail.kind === "index" && (
            <>
              <p className="tabular-nums text-2xl font-bold">
                {detail.row.price?.toLocaleString(undefined, { maximumFractionDigits: detail.row.decimals }) ?? "—"}
                <span
                  className={cn(
                    "ml-2 text-base font-semibold",
                    (detail.row.changePct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {pct(detail.row.changePct)}
                </span>
              </p>
              <p className="text-muted-foreground">
                Source: {detail.row.source.provider} · {detail.row.region}
              </p>
              <Link href={detail.row.href} className="font-semibold text-blue-600 hover:underline">
                Open quote
              </Link>
            </>
          )}
          {detail.kind === "news" && (
            <>
              <p className="leading-snug">{detail.row.title}</p>
              {detail.row.publishedAt ? (
                <p className="text-muted-foreground">
                  Published{" "}
                  <span className="tabular-nums">{new Date(detail.row.publishedAt).toLocaleString()}</span>
                </p>
              ) : null}
              <FeedSourceInfo
                sourceId={detail.row.source}
                asOf={detail.row.publishedAt}
                hubSyncedAt={hubSyncedAt}
                itemUrl={detail.row.link}
                name="Headline source"
              />
              <a href={detail.row.link} className="inline-flex min-h-11 items-center font-semibold text-blue-600" target="_blank" rel="noreferrer">
                Read source
              </a>
            </>
          )}
          {detail.kind === "liquidity" && (
            <>
              <p>{detail.row.dataSummary}</p>
              <SourceTag>{detail.row.sourceName}</SourceTag>
              <a href={detail.row.sourceUrl} className="inline-flex min-h-11 items-center font-semibold text-blue-600" target="_blank" rel="noreferrer">
                Source
              </a>
            </>
          )}
          {detail.kind === "macro" && (
            <>
              <p className="tabular-nums text-2xl font-bold">
                {detail.row.latest != null ? `${detail.row.latest.toFixed(2)} ${detail.row.unit}` : "—"}
              </p>
              {detail.row.date ? <p className="text-muted-foreground tabular-nums">As of {detail.row.date}</p> : null}
              <SourceTag>FRED public CSV</SourceTag>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSheet({
  open,
  onClose,
  sections,
  toggle,
  activeCount,
}: {
  open: boolean;
  onClose: () => void;
  sections: Set<SectionId>;
  toggle: (id: SectionId) => void;
  activeCount: number;
}) {
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end sm:hidden" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close filters" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative rounded-t-2xl border border-border bg-card p-4 pb-8 shadow-lg"
      >
        <h2 id={titleId} className="font-heading text-base font-bold text-foreground">
          Show sections ({activeCount} on)
        </h2>
        <ul className="mt-3 space-y-1">
          {DEFAULT_SECTIONS.map((id) => {
            const on = sections.has(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className={cn(TOUCH_ROW, on ? "bg-blue-600/10 text-blue-600" : "text-foreground")}
                  onClick={() => toggle(id)}
                  aria-pressed={on}
                >
                  {SECTION_LABELS[id]}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function WorldMonitorFreeDashboard() {
  const statusId = useId();
  const [sections, setSections] = useState<Set<SectionId>>(() => new Set(DEFAULT_SECTIONS));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  const { data, error, isLoading, mutate } = useSWR("/api/worldmonitor/global-feeds", fetcher, {
    refreshInterval: 120_000,
  });

  const toggleSection = useCallback((id: SectionId) => {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const globalIndices = useMemo(
    () =>
      (data?.indices.indices ?? [])
        .filter((i) => i.category !== "india" && i.price != null && Number.isFinite(i.price))
        .slice(0, 14),
    [data?.indices.indices],
  );

  const statusText = error
    ? "Global feeds failed to load."
    : isLoading
      ? "Loading global feeds."
      : data?.fetchedAt
        ? `Updated ${new Date(data.fetchedAt).toLocaleString()}.`
        : "";

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-4" role="alert">
        <p className="text-sm text-rose-600">Could not load global feeds.</p>
        <button type="button" className={cn(TOUCH_BTN, "mt-2 text-blue-600")} onClick={() => mutate()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:space-y-6 sm:pb-10">
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusText}
      </div>

      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 border-b border-border bg-background/95 px-1 py-2 backdrop-blur sm:static sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0">
        <p className="text-sm leading-snug text-muted-foreground">
          Free RSS and public feeds · Updated{" "}
          <span className="tabular-nums text-foreground">
            {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : "…"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFiltersOpen(true)} className={cn(TOUCH_BTN, "border border-border bg-card sm:hidden")}>
            <Filter className="h-4 w-4" aria-hidden />
            Filters
            <span className="rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">{sections.size}</span>
          </button>
          <button type="button" onClick={() => mutate()} className={cn(TOUCH_BTN, "border border-border bg-card")}>
            Refresh
          </button>
          <a
            href={worldMonitorExternalUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(TOUCH_BTN, "bg-blue-600 text-white hover:bg-blue-700")}
          >
            Full map
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex" role="group" aria-label="Section filters">
          {DEFAULT_SECTIONS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={sections.has(id)}
              onClick={() => toggleSection(id)}
              className={cn(
                TOUCH_BTN,
                "border text-xs",
                sections.has(id) ? "border-blue-600 bg-blue-600/10 text-blue-600" : "border-border bg-card text-foreground",
              )}
            >
              {SECTION_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-2 lg:gap-6">
        {sections.has("news") ? (
          <Panel
            title="Global intelligence news"
            subtitle="RSS — source & delay shown on each row"
            action={
              <DataInfo
                name="Global news bundle"
                source={{ provider: "World Monitor API", url: "/api/worldmonitor/global-feeds", asOf: data?.fetchedAt }}
                hubSyncedAt={data?.fetchedAt}
                fetchPath="BBC + Google News RSS — buildFreeGlobalFeeds()"
              />
            }
          >
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading headlines…</p>
            ) : (
              <ul className="divide-y divide-border">
                {(data?.news ?? []).map((n) => (
                  <li key={n.id}>
                    <button type="button" className={cn(TOUCH_ROW, "py-2")} onClick={() => setDetail({ kind: "news", row: n })}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">{n.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <FeedSourceInfo
                            sourceId={n.source}
                            asOf={n.publishedAt}
                            hubSyncedAt={data?.fetchedAt}
                            itemUrl={n.link}
                            name="Headline"
                          />
                          {n.publishedAt ? (
                            <time dateTime={n.publishedAt} className="tabular-nums">
                              {new Date(n.publishedAt).toLocaleString()}
                            </time>
                          ) : (
                            <span>Time unknown</span>
                          )}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {sections.has("markets") ? (
          <Panel
            title="Markets"
            subtitle="Yahoo Finance · global indices"
            action={<FeedSourceInfo sourceId="yahoo" name="Yahoo Finance indices" />}
          >
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading quotes…</p>
            ) : (
              <ul className="divide-y divide-border">
                {globalIndices.map((row) => (
                  <li key={row.id}>
                    <button type="button" className={cn(TOUCH_ROW, "py-2")} onClick={() => setDetail({ kind: "index", row })}>
                      <span className="min-w-0 flex-1 break-words text-left text-sm font-medium text-foreground">{row.label}</span>
                      <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                        {row.price != null ? row.price.toLocaleString(undefined, { maximumFractionDigits: row.decimals }) : "—"}{" "}
                        <span className={cn((row.changePct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>{pct(row.changePct)}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {sections.has("macro") ? (
          <Panel
            title="Macro stress"
            subtitle="FRED public CSV · no API key"
            action={<FeedSourceInfo sourceId="fred" name="FRED CSV series" />}
          >
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading macro…</p>
            ) : (
              <ul className="divide-y divide-border">
                {data?.macro.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={cn(TOUCH_ROW, "py-2")} onClick={() => setDetail({ kind: "macro", row: s })}>
                      <span className="min-w-0 flex-1 break-words text-sm text-foreground">{s.name}</span>
                      <span className="shrink-0 text-sm tabular-nums font-medium text-foreground">
                        {s.latest != null ? `${s.latest.toFixed(2)} ${s.unit}` : "—"}
                        {s.date ? <span className="ml-1 text-xs font-normal text-muted-foreground">{s.date}</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {sections.has("liquidity") ? (
          <Panel
            title="Liquidity shifts"
            subtitle="MI feeds · India macro & flows"
            action={
              <DataInfo
                name="What changed cache"
                source={{ provider: "MI what-changed", url: "/api/feeds/what-changed" }}
                fetchPath="getMarketShiftsCached() — NSE/RBI institutional deltas"
              />
            }
          >
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading shifts…</p>
            ) : (
              <ul className="divide-y divide-border">
                {(data?.liquidity.items ?? []).slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <button type="button" className={cn(TOUCH_ROW, "flex-col items-start py-3 sm:flex-row sm:items-center")} onClick={() => setDetail({ kind: "liquidity", row: item })}>
                      <span className="font-medium text-foreground">{item.headline}</span>
                      <span className="line-clamp-2 text-muted-foreground sm:line-clamp-1">{item.dataSummary}</span>
                      <SourceTag>{item.sourceName}</SourceTag>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

      </div>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sections={sections}
        toggle={toggleSection}
        activeCount={sections.size}
      />
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} hubSyncedAt={data?.fetchedAt} />
    </div>
  );
}
