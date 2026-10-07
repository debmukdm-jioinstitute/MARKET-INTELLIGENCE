"use client";

import { Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { useState } from "react";
import useSWR from "swr";

type Announcement = { headline: string; category: string; broadcastDate: string; attachmentUrl: string | null };
type AnnouncementsResponse = {
  symbol: string;
  dbConfigured: boolean;
  count: number;
  items: Announcement[];
  categories: { category: string; count: number }[];
  nseUrl: string;
};

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadAnnouncements(url: string): Promise<AnnouncementsResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as AnnouncementsResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const istDate = (iso: string) =>
  `${new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} IST`;

const linkLabel = (url: string) => (/\.pdf($|\?)/i.test(url) ? "PDF" : "Filing");

export function FilingsPanel({ symbol }: { symbol: string }) {
  const [category, setCategory] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "timeline">("cards");
  const key = `/api/research/announcements?symbol=${encodeURIComponent(symbol)}&limit=20${category ? `&category=${encodeURIComponent(category)}` : ""}`;
  const { data, error, isLoading } = useSWR<AnnouncementsResponse>(key, loadAnnouncements, { revalidateOnFocus: false, keepPreviousData: true });

  return (
    <Panel
      title="Filings & announcements"
      subtitle="Material NSE announcements: results, board outcomes, ratings, management changes, deals, dividends, pledges."
      trust={{ source: "NSE India corporate announcements", note: "Exchange filings shown as filed — not investment advice" }}
      action={
        <div className="inline-flex rounded-md border border-border p-0.5 text-sm font-semibold" role="group" aria-label="View">
          {(["cards", "timeline"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn("rounded px-2.5 py-1", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {v === "cards" ? "Digest" : "Timeline"}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && !data ? <p className="animate-pulse text-sm text-muted-foreground">Loading filings for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load filings right now. Try again in a moment.</p> : null}

      {data && !error ? (
        <div className="space-y-4">
          {data.categories.length > 1 || category ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
              <Chip active={category === null} onClick={() => setCategory(null)} label="All" />
              {data.categories.map((c) => (
                <Chip key={c.category} active={category === c.category} onClick={() => setCategory(c.category)} label={`${c.category} · ${c.count}`} />
              ))}
            </div>
          ) : null}

          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recent filings{category ? ` in “${category}”` : ""} collected for {symbol}.{" "}
              <a href={data.nseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Check NSE directly ↗
              </a>
            </p>
          ) : view === "cards" ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {data.items.map((a) => (
                <li key={`${a.broadcastDate}-${a.headline}`} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-foreground">{a.category}</span>
                    <time dateTime={a.broadcastDate} className="text-sm text-muted-foreground">
                      {istDate(a.broadcastDate)}
                    </time>
                  </div>
                  <p className="line-clamp-3 text-sm text-foreground">{a.headline}</p>
                  <SourceLink a={a} nseUrl={data.nseUrl} />
                </li>
              ))}
            </ul>
          ) : (
            <ol className="relative ml-2 space-y-4 border-l border-border pl-5">
              {data.items.map((a) => (
                <li key={`${a.broadcastDate}-${a.headline}`} className="relative">
                  <span className="absolute -left-[1.62rem] top-1.5 size-2.5 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <time dateTime={a.broadcastDate}>{istDate(a.broadcastDate)}</time>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">{a.category}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{a.headline}</p>
                  <SourceLink a={a} nseUrl={data.nseUrl} />
                </li>
              ))}
            </ol>
          )}

          <p className="text-sm text-muted-foreground">
            Source:{" "}
            <a href={data.nseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NSE corporate announcements ↗
            </a>
            {data.dbConfigured ? "" : " (Database not configured on this deployment.)"}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SourceLink({ a, nseUrl }: { a: Announcement; nseUrl: string }) {
  const href = a.attachmentUrl ?? nseUrl;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold text-primary hover:underline">
      {a.attachmentUrl ? `${linkLabel(a.attachmentUrl)} ↗` : "NSE source ↗"}
    </a>
  );
}
