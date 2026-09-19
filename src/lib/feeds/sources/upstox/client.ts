/**
 * Shared Upstox client bits — every category (quotes, option chain, candles,
 * fundamentals, news, IPO, market info) authenticates the same way, with a
 * free 1-year read-only "Analytics Token" (no daily re-login, unlike a normal
 * Upstox trading OAuth token): generate one from
 * https://account.upstox.com/developer/apps#analytics and set
 * UPSTOX_ACCESS_TOKEN. Docs: https://upstox.com/developer/api-documentation/
 */

export const UPSTOX_BASE_URL = "https://api.upstox.com";

/** Returns the auth headers, or null when UPSTOX_ACCESS_TOKEN isn't configured. */
export function upstoxHeaders(): Record<string, string> | null {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}
