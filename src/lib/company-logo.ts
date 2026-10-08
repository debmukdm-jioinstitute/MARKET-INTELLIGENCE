import manifest from "@/lib/company-logo-manifest.json";

const AVAILABLE: ReadonlySet<string> = new Set(manifest.available);

/** Static, self-hosted logo path for an NSE symbol, or null when we have none (use the letter fallback). */
export function logoUrl(symbol: string | null | undefined): string | null {
  const s = symbol?.trim().toUpperCase();
  if (!s || !AVAILABLE.has(s)) return null;
  // Raw symbol on purpose (e.g. "M&MFIN.png"): browsers percent-encode as needed.
  return `/logos/${s}.png`;
}
