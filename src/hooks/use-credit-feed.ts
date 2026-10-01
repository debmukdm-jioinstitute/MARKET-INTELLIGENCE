import type { CreditFeedSnapshot } from "@/lib/credit/types";
import useSWR from "swr";

async function loadCreditFeed(key: string): Promise<CreditFeedSnapshot> {
  const res = await fetch(key);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CreditFeedSnapshot>;
}

export function useCreditFeed() {
  const { data, error, isLoading, mutate } = useSWR<CreditFeedSnapshot>("/api/credit", loadCreditFeed, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return { snapshot: data, loading: isLoading, error, refresh: mutate };
}
