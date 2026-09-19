const DEFAULT_UA =
  process.env.FEED_USER_AGENT ??
  "MarketIntelligence/1.0 (+https://getmarketintelligence.vercel.app; feeds@market-intelligence.local)";

export async function feedFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 14_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "application/json, application/xml, text/xml, text/csv, */*",
        ...init?.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value?: T; error?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}
