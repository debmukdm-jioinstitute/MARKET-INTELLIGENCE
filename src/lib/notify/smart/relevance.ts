/**
 * Smart notifications — per-user relevance.
 *
 * relevance ∈ [0,1]:
 *   1.0  user holds the symbol (portfolio_holdings)
 *   0.7  user viewed the symbol page in the last 7 days (analytics_events)
 *   0.5  symbol's sector matches a sector the user holds/views
 *   else per-category click-through affinity (Laplace-smoothed, default 0.5)
 * Guests get a flat 0.5 — rank then equals importance × decay.
 */
import { hasDatabase, sql } from "@/lib/db";

export interface UserContext {
  email: string | null;
  holdings: { symbol: string; sector: string | null }[];
  viewedSymbols: string[];
  affinity: Record<string, number>; // category → 0..1
}

const SYMBOL_FROM_PATH = [
  /\/research\/([A-Za-z0-9&.\-]{1,20})/,
  /[?&]symbol=([A-Za-z0-9&.\-]{1,20})/,
];

function symbolFromPath(path: string): string | null {
  for (const re of SYMBOL_FROM_PATH) {
    const m = re.exec(path);
    if (m?.[1]) {
      const s = m[1].toUpperCase().replace(/[^A-Z0-9&.\-]/g, "");
      if (s && s !== "IPO") return s;
    }
  }
  return null;
}

export async function getUserContext(email: string | null): Promise<UserContext> {
  const ctx: UserContext = { email, holdings: [], viewedSymbols: [], affinity: {} };
  if (!email || !hasDatabase()) return ctx;
  const db = sql();
  try {
    const h = (await db`SELECT symbol, sector FROM portfolio_holdings WHERE user_email = ${email}`) as {
      symbol: string; sector: string | null;
    }[];
    ctx.holdings = h.map((x) => ({ symbol: x.symbol.toUpperCase(), sector: x.sector }));
    const v = (await db`
      SELECT path FROM analytics_events
      WHERE user_email = ${email} AND created_at > now() - interval '7 days'
      ORDER BY created_at DESC LIMIT 200`) as { path: string }[];
    const seen = new Set<string>();
    for (const row of v) {
      const s = symbolFromPath(row.path);
      if (s) seen.add(s);
    }
    ctx.viewedSymbols = [...seen].slice(0, 50);
    const inter = (await db`
      SELECT e.category,
             COUNT(*) FILTER (WHERE i.action = 'clicked') AS clicks,
             COUNT(*) FILTER (WHERE i.action IN ('shown','clicked','dismissed')) AS shown
      FROM notification_interactions i JOIN site_events e ON e.id = i.event_id
      WHERE i.user_email = ${email} GROUP BY e.category`) as { category: string; clicks: string; shown: string }[];
    for (const r of inter) {
      const clicks = Number(r.clicks), shown = Number(r.shown);
      // Laplace smoothing: (clicks+1)/(shown+2), clamped — cold start ≈ 0.5.
      ctx.affinity[r.category] = Math.min(0.95, Math.max(0.15, (clicks + 1) / (shown + 2)));
    }
  } catch { /* personalization is best-effort; empty context still ranks */ }
  return ctx;
}

/** Pure: compute relevance from an already-loaded context (unit-testable, no DB). */
export function relevanceFor(
  event: { symbol?: string | null; category: string; sector?: string | null },
  ctx: UserContext,
): number {
  const sym = (event.symbol ?? "").toUpperCase();
  if (sym && ctx.holdings.some((h) => h.symbol === sym)) return 1.0;
  if (sym && ctx.viewedSymbols.includes(sym)) return 0.7;
  if (event.sector) {
    const heldSectors = new Set(ctx.holdings.map((h) => (h.sector ?? "").toLowerCase()).filter(Boolean));
    if (heldSectors.has(event.sector.toLowerCase())) return 0.5;
  }
  const aff = ctx.affinity[event.category];
  return aff ?? 0.5;
}

/** IST hour (0–23) for quiet-hours checks. */
export function istHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now);
  return Number(parts) % 24;
}

export function inQuietHours(quietStart: number, quietEnd: number, now?: Date): boolean {
  const h = istHour(now);
  return quietStart <= quietEnd ? h >= quietStart && h < quietEnd : h >= quietStart || h < quietEnd;
}
