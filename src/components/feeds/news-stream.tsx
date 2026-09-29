"use client";

import { matchMonitor, useMonitors } from "@/hooks/use-monitors";
import { FeedSourceInfo } from "@/components/feeds/feed-source-info";
import type { NewsItem } from "@/lib/feeds/types";
import { formatNewsPublishedAt, sortNewsByFreshness } from "@/lib/feeds/news-sort";

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
  const slice = sortNewsByFreshness(items).slice(0, limit);
  if (!slice.length) {
    return <p className="text-sm text-muted-foreground">No headlines pulled yet — retry in a minute.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {slice.map((item) => {
        const hit = matchMonitor(monitors, item.title);
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
