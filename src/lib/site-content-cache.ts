let cache: { at: number; overrides: Record<string, string> } | null = null;

export function getSiteContentCache() {
  return cache;
}

export function setSiteContentCache(overrides: Record<string, string>) {
  cache = { at: Date.now(), overrides };
}

export function clearSiteContentCache() {
  cache = null;
}
