import type { PromoterFeedSnapshot } from "@/lib/promoters/feed-types";
import useSWR from "swr";

async function loadPromoterFeed(key: string): Promise<PromoterFeedSnapshot> {
  const res = await fetch(key);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<PromoterFeedSnapshot>;
}

export function usePromoterFeed() {
  const { data, error, isLoading, mutate } = useSWR<PromoterFeedSnapshot>("/api/promoters", loadPromoterFeed, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return { snapshot: data, loading: isLoading, error, refresh: mutate };
}
