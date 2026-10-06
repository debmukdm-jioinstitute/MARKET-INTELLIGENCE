import type { Brief } from "@/lib/brief/types";
import type { SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { headlineSeverityScore } from "@/lib/homedashboard/headline-severity";
import { isToday } from "./insights";

export type BriefResponse = {
  briefs?: Brief[];
  siteWideBrief?: SiteWideExecutiveBrief;
};
export type HomeHeadline = {
  title: string;
  source: string;
  href: string;
  time: string;
  publishedAt?: string;
  sector: string;
  symbols: string[];
  why: string;
  severity?: number;
};
function normalized(text: string) {
  return ` ${text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()} `;
}
export function mentions(text: string, symbol: string, name?: string) {
  const value = normalized(text);
  return (
    value.includes(normalized(symbol)) ||
    Boolean(
      name &&
      value.includes(normalized(name.replace(/\s+(Ltd\.?|Limited)$/i, ""))),
    )
  );
}
function annotate(title: string) {
  const matches = NIFTY_500.filter(([symbol, name]) =>
    mentions(title, symbol, name),
  );
  const sector =
    matches[0]?.[2] ??
    (/\b(earnings|quarter|Q[1-4]|results)\b/i.test(title)
      ? "Earnings"
      : /\b(fraud|scam|manipulation|penalty|ban|sebi order)\b/i.test(title)
        ? "Regulation & enforcement"
        : /\b(war|geopolit|sanction|tariff|oil|middle east|china|ukraine)\b/i.test(title)
          ? "Global & geopolitics"
          : /\b(rbi|rates?|inflation|gdp)\b/i.test(title)
            ? "Economy & policy"
            : /\b(sebi|nse|bse)\b/i.test(title)
              ? "Market regulation"
              : "Market news");
  return {
    sector,
    symbols: matches.map(([symbol]) => symbol),
    why: matches.length
      ? `Watch the implications for ${matches
          .slice(0, 2)
          .map(([, name]) => name)
          .join(" and ")} and their sector.`
      : sector === "Economy & policy"
        ? "Policy and economic changes can affect borrowing costs and company earnings."
        : sector === "Market regulation"
          ? "Exchange and regulatory changes can affect how you trade and manage risk."
          : "Check the original report for the companies and market conditions affected.",
  };
}
export function briefHeadlines(
  data: BriefResponse | undefined,
): HomeHeadline[] {
  const stories: HomeHeadline[] = [];
  for (const brief of data?.briefs ?? []) {
    for (const h of brief.headlines ?? [])
      stories.push({
        ...annotate(h.title),
        title: h.title,
        source: h.source,
        href: h.link,
        time: "From the latest brief",
        publishedAt: brief.generatedAt,
        severity: headlineSeverityScore(h.title),
      });
  }
  for (const h of data?.siteWideBrief?.regulatorHeadlines ?? []) {
    stories.push({
      ...annotate(h.title),
      title: h.title,
      source: h.source,
      href: h.link ?? "/intelligence/brief",
      time: h.timeAgo,
      publishedAt: h.publishedAt,
      severity: headlineSeverityScore(h.title),
    });
  }
  const unique = [...new Map(stories.map((h) => [h.title, h])).values()];
  unique.sort((a, b) => {
    const sd = (b.severity ?? 0) - (a.severity ?? 0);
    if (sd !== 0) return sd;
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  return unique;
}

export function mergeHomeHeadlines(primary: HomeHeadline[], secondary: HomeHeadline[], max = 5): HomeHeadline[] {
  const map = new Map<string, HomeHeadline>();
  for (const h of [...primary, ...secondary]) {
    const key = h.title.toLowerCase();
    if (!map.has(key)) map.set(key, h);
  }
  return [...map.values()]
    .sort((a, b) => {
      const sd = (b.severity ?? 0) - (a.severity ?? 0);
      if (sd !== 0) return sd;
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    })
    .slice(0, max);
}
export function trendingSymbol(data: BriefResponse | undefined, now: Date) {
  const counts = new Map<string, number>();
  const todayBriefs =
    data?.briefs?.filter((b) => isToday(b.generatedAt, now)) ?? [];
  const titles = new Set(
    todayBriefs.flatMap((b) => b.headlines.map((h) => h.title)),
  );
  for (const title of titles)
    for (const symbol of annotate(title).symbols)
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  return (
    [...counts].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? null
  );
}
