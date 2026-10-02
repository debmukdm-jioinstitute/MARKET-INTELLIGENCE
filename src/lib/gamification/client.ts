"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";

export interface XpActionBreakdown {
  action: string;
  label: string;
  count: number;
  points: number;
}

export interface XpRecentEvent {
  action: string;
  label: string;
  points: number;
  created_at: string;
}

export interface XpSummary {
  total: number;
  level: string;
  nextLevel: string | null;
  progressPct: number;
  byAction: XpActionBreakdown[];
  recent: XpRecentEvent[];
}

async function postAward(action: string, page?: string): Promise<void> {
  try {
    await fetch("/api/gamification/award", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(page ? { action, page } : { action }),
    });
    // Fire-and-forget by design: the response is intentionally ignored.
    // 401 (guest), 400 (unknown action) and network failures all fail silently.
  } catch {
    /* offline — silently ignore */
  }
}

/**
 * Award XP for a gamification action. Fire-and-forget: the returned promise
 * never rejects — guests, unknown actions and offline all fail silently.
 * Callers should `void awardXp(...)` and never await it in UI flows.
 */
export function awardXp(action: string, page?: string): Promise<void> {
  return postAward(action, page);
}

async function loadXpSummary(): Promise<XpSummary> {
  const res = await fetch("/api/gamification/me");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : `Request failed (${res.status})`);
  return json as XpSummary;
}

/**
 * The signed-in user's XP summary. Fetches once when auth is ready and the
 * user holds a real (non-guest) account. Returns { data, loading } and never
 * throws — failures resolve to data: null so callers render an empty state.
 */
export function useXpSummary(): { data: XpSummary | null; loading: boolean } {
  const { user, isGuest, ready } = useAuth();
  const email = user?.email ?? null;
  const [data, setData] = useState<XpSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || isGuest || !email) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadXpSummary()
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, isGuest, email]);

  return { data, loading };
}
