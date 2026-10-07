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
export function useXpSummary(): { data: XpSummary | null; loading: boolean } {  const { user, isGuest, ready } = useAuth();
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

/* ------------------------------------------------------------------ */
/* Engagement heartbeat — XP for daily usage                           */
/* ------------------------------------------------------------------ */

export interface HeartbeatAward {
  action: string;
  label: string;
  points: number;
}

export interface HeartbeatState {
  minutesToday: number;
  streak: number;
  awarded: HeartbeatAward[];
}

/** One heartbeat ping. Fire-and-forget: 401 (guest) and network failures fail silently. */
async function postHeartbeat(): Promise<void> {
  try {
    await fetch("/api/gamification/heartbeat", { method: "POST" });
  } catch {
    /* offline — silently ignore */
  }
}

/** Module-level loader (stable identity — see check:react-loops): one ping, parsed state or null. */
async function loadHeartbeatState(): Promise<HeartbeatState | null> {
  try {
    const res = await fetch("/api/gamification/heartbeat", { method: "POST" });
    if (!res.ok) return null; // 401 (guest) etc. — silent by design
    const json = (await res.json().catch(() => null)) as {
      minutesToday?: number;
      streak?: number;
      awarded?: HeartbeatAward[];
    } | null;
    if (!json) return null;
    return {
      minutesToday: typeof json.minutesToday === "number" ? json.minutesToday : 0,
      streak: typeof json.streak === "number" ? json.streak : 0,
      awarded: Array.isArray(json.awarded) ? json.awarded : [],
    };
  } catch {
    return null;
  }
}

/**
 * Reports engaged minutes to /api/gamification/heartbeat: once on mount and
 * then every 60s while the tab is visible. Signed-in non-guest users only.
 * Fire-and-forget — never throws, never affects UI.
 */
export function useEngagementHeartbeat(): void {
  const { user, isGuest, ready } = useAuth();
  const active = ready && !isGuest && !!user?.email;

  useEffect(() => {
    if (!active) return;
    void postHeartbeat(); // one ping on mount
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void postHeartbeat();
    }, 60000);
    return () => {
      window.clearInterval(timer);
    };
  }, [active]);
}

/**
 * Engagement state for the XP journey card: minutes today + day streak.
 * Pings the heartbeat once on mount (counts as one engaged minute) for
 * signed-in non-guest users. Returns { state, loading }; never throws.
 */
export function useHeartbeatState(): { state: HeartbeatState | null; loading: boolean } {
  const { user, isGuest, ready } = useAuth();
  const email = user?.email ?? null;
  const [state, setState] = useState<HeartbeatState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || isGuest || !email) {
      setState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadHeartbeatState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, isGuest, email]);

  return { state, loading };
}
