/** Cookie helpers for upstreams that set multiple `Set-Cookie` headers. */

const POISON_COOKIE = /^(bm_|_abck$|ak_bmsc$)/i;

export function cookiePairsFromResponse(res: Response): string[] {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) return raw.map((c) => c.split(";")[0]!.trim()).filter(Boolean);
  const single = res.headers.get("set-cookie");
  return single ? [single.split(";")[0]!.trim()].filter(Boolean) : [];
}

function applyPair(map: Map<string, string>, pair: string) {
  const i = pair.indexOf("=");
  if (i <= 0) return;
  const name = pair.slice(0, i).trim();
  if (!name) return;
  map.set(name, pair.slice(i + 1).trim());
}

/** Merge new `name=value` pairs into an existing Cookie header, keyed by name. */
export function mergeCookieHeader(existing: string | undefined, pairs: string[]): string | undefined {
  if (!pairs.length) return existing || undefined;
  const map = new Map<string, string>();
  if (existing) {
    for (const part of existing.split(";")) applyPair(map, part.trim());
  }
  for (const pair of pairs) applyPair(map, pair);
  if (!map.size) return existing || undefined;
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function isPoisonCookieName(name: string): boolean {
  return POISON_COOKIE.test(name);
}

/**
 * Drop Akamai bot-manager cookies. A non-browser UA that "successfully" hits
 * www.nseindia.com gets `bm_*` / `ak_bmsc` / `_abck`; attaching those to later
 * `/api/*` calls makes them hang until timeout. Session cookies (`AKA_A2`,
 * `nsit`, `nseappid`) are kept.
 */
export function stripPoisonCookies(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const kept: string[] = [];
  for (const part of header.split(";")) {
    const pair = part.trim();
    const name = pair.split("=")[0] ?? "";
    if (!name || isPoisonCookieName(name)) continue;
    kept.push(pair);
  }
  return kept.length ? kept.join("; ") : undefined;
}

export function mergeCookiesFromResponse(
  existing: string | undefined,
  res: Response,
  opts?: { stripPoison?: boolean },
): string | undefined {
  const merged = mergeCookieHeader(existing, cookiePairsFromResponse(res));
  return opts?.stripPoison ? stripPoisonCookies(merged) : merged;
}

export function looksLikeHtmlText(text: string): boolean {
  return /^\s*(<!doctype html|<html|<head|<body)/i.test(text);
}
