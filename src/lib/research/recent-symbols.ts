/**
 * Recently-viewed research symbols ("Continue where you left off").
 *
 * localStorage-backed, following the cached-raw-string pattern from
 * src/hooks/use-my-portfolio.ts: getSnapshot() must return a stable identity
 * while the underlying storage string is unchanged, otherwise
 * useSyncExternalStore render-loops (React error #185). Do not invent a new
 * pattern here.
 */

export interface RecentSymbol {
  symbol: string;
  name: string;
  /** epoch ms of last view */
  ts: number;
}

const STORAGE_KEY = "mi-recent-symbols";
const MAX_RECENTS = 8;

let cachedRaw: string | null | undefined;
let cached: RecentSymbol[] | null = null;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): RecentSymbol[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is Record<string, unknown> =>
          !!e && typeof e === "object" && typeof (e as Record<string, unknown>).symbol === "string",
      )
      .map((e) => {
        const symbol = String(e.symbol).toUpperCase();
        return {
          symbol,
          name: typeof e.name === "string" && e.name.trim() ? e.name.trim() : symbol,
          ts: typeof e.ts === "number" ? e.ts : 0,
        };
      })
      .filter((r) => r.symbol.length > 0)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/** Stable-identity snapshot: same array while the storage string is unchanged. */
export function getRecentSymbols(): RecentSymbol[] {
  const raw = readRaw();
  if (raw === cachedRaw && cached) return cached;
  cachedRaw = raw;
  cached = parse(raw);
  return cached;
}

/** Prepend (dedupe, most-recent-first, cap 8) and notify subscribers. */
export function recordRecentSymbol(symbol: string, name?: string): void {
  if (typeof window === "undefined") return;
  const sym = symbol.trim().toUpperCase();
  if (!sym) return;
  try {
    const next: RecentSymbol[] = [
      { symbol: sym, name: name && name.trim() ? name.trim() : sym, ts: Date.now() },
      ...getRecentSymbols().filter((r) => r.symbol !== sym),
    ].slice(0, MAX_RECENTS);
    const raw = JSON.stringify(next);
    if (raw === cachedRaw) return;
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cached = next;
    window.dispatchEvent(new Event("mi_recent_symbols_updated"));
  } catch {
    /* storage unavailable or full: recents are best-effort */
  }
}

export function subscribeRecentSymbols(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const bump = () => callback();
  window.addEventListener("mi_recent_symbols_updated", bump);
  window.addEventListener("storage", bump);
  return () => {
    window.removeEventListener("mi_recent_symbols_updated", bump);
    window.removeEventListener("storage", bump);
  };
}
