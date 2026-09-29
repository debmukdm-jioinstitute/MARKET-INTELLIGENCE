import type { OfferCategory, OfferReport } from "@/lib/feeds/offers/types";
import useSWR from "swr";

async function loadOffersReport(key: string): Promise<OfferReport> {
  const res = await fetch(key);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OfferReport>;
}

export function useOffersReport(category: OfferCategory, year?: number) {
  const y = year ?? new Date().getFullYear();
  const { data, error, isLoading } = useSWR<OfferReport>(
    `/api/feeds/offers?category=${category}&year=${y}`,
    loadOffersReport,
  );
  return { report: data, loading: isLoading, error };
}
