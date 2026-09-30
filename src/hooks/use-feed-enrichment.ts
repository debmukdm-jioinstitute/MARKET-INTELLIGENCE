"use client";

import useSWR from "swr";

export type FeedEnrichment = Record<string, { sentiment: "positive" | "negative" | "neutral" | null; category: string | null }>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** AI sentiment/category badges for feed headlines — optional overlay, never blocks the feed
 * itself from rendering (NewsStream renders identically whether this is empty or populated). */
export function useFeedEnrichment() {
  const { data } = useSWR<{ enrichment: FeedEnrichment }>("/api/hf/feed-enrichment", fetcher, {
    refreshInterval: 1_800_000,
    revalidateOnFocus: false,
  });
  return data?.enrichment ?? {};
}
