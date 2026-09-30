"use client";

import { matchMonitor, useMonitors } from "@/hooks/use-monitors";
import { FeedSourceInfo } from "@/components/feeds/feed-source-info";
import type { NewsItem } from "@/lib/feeds/types";
import { formatNewsPublishedAt, sortNewsByFreshness } from "@/lib/feeds/news-sort";
import { useFeedEnrichment } from "@/hooks/use-feed-enrichment";

const SENTIMENT_BADGE: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  negative: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  neutral: "bg-muted text-muted-foreground",
};

const SOURCE_LABEL: Record<NewsItem["source"], string> = {
  nse: "NSE",
  bse: "BSE",
  rbi: "RBI",
  sec: "SEC",
  yahoo: "Yahoo",
  stooq: "Stooq",
  alphavantage: "Alpha Vantage",
  fred: "FRED",
  worldbank: "World Bank",
  data360: "Data360",
  imf: "IMF",
  oecd: "OECD",
  mospi: "MOSPI",
  biquote: "India quotes",
  upstox: "Upstox",
  massive: "Massive",
  reddit: "Reddit",
  livemint: "LiveMint",
  moneycontrol: "Moneycontrol",
  googlenews: "Google News",
  busstd: "Business Standard",
  rsswire: "RSS",
};

export function NewsStream({
  items,
  limit = 20,
  hubSyncedAt,
}: {
  items: NewsItem[];
  limit?: number;
  hubSyncedAt?: string;
}) {
  const { monitors } = useMonitors();
  const enrichment = useFeedEnrichment();
  const slice = sortNewsByFreshness(items).slice(0, limit);
  if (!slice.length) {
    return <p className="text-sm text-muted-foreground">No headlines pulled yet — retry in a minute.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {slice.map((item) => {
        const hit = matchMonitor(monitors, item.title);
        const ai = enrichment[item.id];
        return (
        <li key={item.id} className="py-3 pl-2" style={hit ? { borderLeft: `3px solid ${hit.color}` } : undefined}>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-primary"
          >
            {item.title}
          </a>
          {ai?.sentiment || ai?.category ? (
            <span className="ml-2 inline-flex items-center gap-1 align-middle">
              {ai.sentiment ? (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${SENTIMENT_BADGE[ai.sentiment]}`}>
                  {ai.sentiment}
                </span>
              ) : null}
              {ai.category ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {ai.category.replace(/-/g, " ")}
                </span>
              ) : null}
            </span>
          ) : null}
          <p className="mt-1 text-sm uppercase tracking-wide text-muted-foreground inline-flex flex-wrap items-center gap-0.5">
            {SOURCE_LABEL[item.source]}
            <FeedSourceInfo
              sourceId={item.source}
              asOf={item.publishedAt}
              hubSyncedAt={hubSyncedAt}
              itemUrl={item.link}
              name={SOURCE_LABEL[item.source]}
              className="ml-0.5"
            />
            {item.publishedAt ? ` · ${formatNewsPublishedAt(item.publishedAt)}` : ""}
            {hit ? <span style={{ color: hit.color }}> · monitor: {hit.keywords.join(", ")}</span> : null}
          </p>
        </li>
        );
      })}
    </ul>
  );
}
