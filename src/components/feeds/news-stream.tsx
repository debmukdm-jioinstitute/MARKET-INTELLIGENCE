import type { NewsItem } from "@/lib/feeds/types";

const SOURCE_LABEL: Record<NewsItem["source"], string> = {
  nse: "NSE",
  bse: "BSE",
  rbi: "RBI",
  sec: "SEC",
  yahoo: "Yahoo",
  stooq: "Stooq",
  alphavantage: "Alpha Vantage",
  fred: "FRED",
  worldbank: "World Bank",
  imf: "IMF",
  oecd: "OECD",
  mospi: "MOSPI",
  biquote: "India quotes",
  upstox: "Upstox",
  massive: "Massive",
};

export function NewsStream({ items, limit = 20 }: { items: NewsItem[]; limit?: number }) {
  const slice = items.slice(0, limit);
  if (!slice.length) {
    return <p className="text-sm text-muted-foreground">No headlines pulled yet — retry in a minute.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {slice.map((item) => (
        <li key={item.id} className="py-3">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-primary"
          >
            {item.title}
          </a>
          <p className="mt-1 text-sm uppercase tracking-wide text-muted-foreground">
            {SOURCE_LABEL[item.source]}
            {item.publishedAt ? ` · ${item.publishedAt}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
