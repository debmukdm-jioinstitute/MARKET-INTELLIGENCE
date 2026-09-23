"use client";

import type { MarketHoliday } from "@/lib/feeds/sources/upstox";
import useSWR from "swr";

type MarketInfoResponse = {
  holidays: MarketHoliday[];
  todayHoliday: MarketHoliday | null;
  nextHoliday: MarketHoliday | null;
};

const IST_OFFSET_MIN = 5.5 * 60;

function nowIst() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + IST_OFFSET_MIN * 60_000);
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

export function useMarketStatus(refreshMs = 60_000) {
  const { data: info } = useSWR<MarketInfoResponse>("/api/feeds/upstox/market-info", fetcher, {
    refreshInterval: refreshMs,
  });

  const ist = nowIst();
  const day = ist.getDay();
  const minutesSinceMidnight = ist.getHours() * 60 + ist.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const inSession = minutesSinceMidnight >= 9 * 60 + 15 && minutesSinceMidnight <= 15 * 60 + 30;
  const isHoliday = Boolean(info?.todayHoliday);
  const isOpen = isWeekday && inSession && !isHoliday;

  return {
    isOpen,
    todayHoliday: info?.todayHoliday ?? null,
    nextHoliday: info?.nextHoliday ?? null,
  };
}
