/** Pure Yahoo market-cap extraction (v7 quote + v10 quoteSummary). */

function rawNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (v && typeof v === "object" && "raw" in v) {
    const n = Number((v as { raw: unknown }).raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function marketCapFromYahooQuote(row: {
  marketCap?: number | null;
}): number | null {
  const cap = row.marketCap;
  if (cap != null && cap > 0 && Number.isFinite(cap)) return cap;
  return null;
}

/**
 * Indian Yahoo quotes often omit `marketCap` even with a crumb. quoteSummary
 * `price.marketCap` is also empty; `defaultKeyStatistics.floatShares.raw ×
 * price.regularMarketPrice` is a usable free-float proxy.
 */
export function marketCapFromQuoteSummary(json: unknown): number | null {
  const result = (json as {
    quoteSummary?: {
      result?: Array<{
        price?: Record<string, unknown>;
        defaultKeyStatistics?: Record<string, unknown>;
      }>;
    };
  })?.quoteSummary?.result?.[0];
  if (!result) return null;

  const price = result.price ?? {};
  const stats = result.defaultKeyStatistics ?? {};
  const listed = rawNum(price.marketCap);
  if (listed != null) return listed;

  const px =
    rawNum(price.regularMarketPrice) ??
    rawNum(price.regularMarketPreviousClose) ??
    rawNum(price.postMarketPrice);
  const shares =
    rawNum(stats.floatShares) ??
    rawNum(stats.sharesOutstanding) ??
    rawNum(stats.impliedSharesOutstanding);
  if (px != null && shares != null) return px * shares;
  return null;
}
