import { feedFetch } from "@/lib/feeds/http";

/** Index universe by NSE family; names match `Index Name` in the NSE daily close archive. */
const FAMILY_NAMES = {
  Broad: "Nifty Smallcap 50, Nifty Microcap 250, Nifty Smallcap 100, Nifty Smallcap 500, Nifty Midcap 50, Nifty Next 50, Nifty Smallcap 250, Nifty MidSmallcap400 50:50, Nifty MidSmallcap 400, Nifty Midcap 100, Nifty Midcap 150, Nifty500 LargeMidSmall Equal-Cap Weighted, Nifty500 Multicap 50:25:25, Nifty LargeMidcap 250, Nifty India FPI 150, Nifty 500, Nifty 200, Nifty 100, Nifty 50, Nifty Midcap Select, Nifty Total Market",
  Sector: "Nifty Metal, Nifty Pharma, Nifty MidSmall Healthcare, Nifty500 Healthcare, Nifty PSU Bank, Nifty Healthcare, Nifty MidSmall Financial Services, Nifty Media, Nifty MidSmall IT & Telecom, Nifty REITs & Realty, Nifty Bank, Nifty Private Bank, Nifty Auto, Nifty Chemicals, Nifty IT, Nifty Financial Services Ex-Bank, Nifty Oil & Gas, Nifty Financial Services, Nifty Financial Services 25/50, Nifty Consumer Durables, Nifty Realty, Nifty Cement, Nifty FMCG",
  Strategy: "Nifty200 Value 30, Nifty High Beta 50, Nifty500 Value 50, Nifty Smallcap250 Momentum Quality 100, Nifty Alpha 50, Nifty MidSmallcap400 Momentum Quality 100, Nifty100 Equal Weight, Nifty200 Alpha 30, Nifty500 Quality 50, Nifty50 Equal Weight, Nifty500 Equal Weight, Nifty Total Market Momentum Quality 50, Nifty Midcap150 Momentum 50, Nifty500 Momentum 50, Nifty500 Low Volatility 50, Nifty Alpha Quality Low-Volatility 30, Nifty Alpha Low-Volatility 30, Nifty Growth Sectors 15, Nifty Midcap150 Quality 50, Nifty100 Low Volatility 30, Nifty200 Quality 30, Nifty Low Volatility 50, Nifty500 Multifactor MQVLv 50, Nifty Top 20 Equal Weight, Nifty Quality Low-Volatility 30, Nifty500 Multicap Momentum Quality 50, Nifty Alpha Quality Value Low-Volatility 30, Nifty50 Value 20, Nifty Smallcap250 Quality 50, Nifty200 Momentum 30, Nifty500 Flexicap Quality 30, Nifty Top 15 Equal Weight, Nifty100 Alpha 30, Nifty Top 10 Equal Weight, Nifty Dividend Opportunities 50, Nifty100 Quality 30",
  Theme: "Nifty Capital Markets, Nifty India Defence, Nifty REITs & InvITs, Nifty IPO, Nifty India Corporate Group Index - Aditya Birla Group, Nifty100 Liquid 15, Nifty Energy, Nifty Commodities, Nifty Midcap Liquid 15, Nifty500 Multicap India Manufacturing 50:30:20, Nifty India Select 5 Corporate Groups (MAATR), Nifty India Infrastructure & Logistics, Nifty MNC, Nifty Conglomerate 50, Nifty100 ESG, Nifty100 Enhanced ESG, Nifty500 Multicap Infrastructure 50:30:20, Nifty India Corporate Group Index - Tata Group 25% Cap, Nifty Mobility, Nifty EV & New Age Automotive, Nifty Infrastructure, Nifty Housing, Nifty PSE, Nifty India Corporate Group Index - Mahindra Group, Nifty Shariah 25, Nifty CPSE, Nifty500 Shariah, Nifty SME Emerge, Nifty Services Sector, Nifty Transportation & Logistics, Nifty India Corporate Group Index - Tata Group, Nifty100 ESG Sector Leaders, Nifty India Internet, Nifty India New Age Consumption, Nifty50 Shariah, Nifty Rural, Nifty Waves, Nifty India Consumption, Nifty Core Housing, Nifty Non-Cyclical Consumer, Nifty MidSmall India Consumption, Nifty India Tourism, Nifty India Railways PSU, Nifty India Digital, Nifty India Manufacturing",
} as const;

export type IndexFamily = keyof typeof FAMILY_NAMES;

/** Archive uses a longer name for this one. */
const ARCHIVE_ALIAS: Record<string, string> = { "nifty healthcare": "nifty healthcare index" };

export const PERIODS = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "10Y"] as const;
/** 3Y and longer are annualised (CAGR); shorter periods are absolute. */
const CAGR_YEARS: Partial<Record<(typeof PERIODS)[number], number>> = { "3Y": 3, "5Y": 5, "10Y": 10 };
export type Period = (typeof PERIODS)[number];

export type IndexReturnRow = {
  name: string;
  family: IndexFamily;
  /** ~52 weekly closes, oldest first. */
  spark: number[];
  returns: Record<Period, number | null>;
};

export type IndexReturnsPayload = { asOf: string; rows: IndexReturnRow[] };

const BASE = "https://nsearchives.nseindia.com/content/indices/";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
  Referer: "https://www.nseindia.com/",
};

type Day = { date: Date; close: Map<string, number> };

const p2 = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${p2(d.getUTCDate())}${p2(d.getUTCMonth() + 1)}${d.getUTCFullYear()}`;
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);
function monthsBack(d: Date, m: number) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, 1));
  r.setUTCDate(Math.min(d.getUTCDate(), new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate()));
  return r;
}

export function parseCloseCsv(text: string): Map<string, number> | null {
  if (/^\s*</.test(text)) return null;
  const out = new Map<string, number>();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const c = line.split(",");
    const v = Number(c[5]);
    if (c[0] && c[5]?.trim() && Number.isFinite(v)) out.set(c[0].trim().toLowerCase(), v);
  }
  return out.size ? out : null;
}

const dayCache = new Map<string, Promise<Map<string, number> | null>>();
function fetchDay(d: Date) {
  const k = key(d);
  let p = dayCache.get(k);
  if (!p) {
    p = feedFetch(`${BASE}ind_close_all_${k}.csv`, { headers: HEADERS, attempts: 2, timeoutMs: 10_000, next: { revalidate: 86_400 } })
      .then((r) => (r.ok ? r.text().then(parseCloseCsv) : null))
      .catch(() => null);
    dayCache.set(k, p);
  }
  return p;
}

/** Closest trading day on or before `d` (skips weekends and holidays). */
async function nearest(d: Date): Promise<Day | null> {
  for (let i = 0; i < 7; i++) {
    const date = shift(d, -i);
    const close = await fetchDay(date);
    if (close) return { date, close };
  }
  return null;
}

export async function buildIndexReturns(now = new Date()): Promise<IndexReturnsPayload | null> {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const latest = await nearest(today);
  if (!latest) return null;
  const T = latest.date;
  const before = (d: Date) => nearest(d);

  const [prev, ...rest] = await Promise.all([
    before(shift(T, -1)),
    before(shift(T, -7)),
    before(monthsBack(T, 1)),
    before(monthsBack(T, 3)),
    before(monthsBack(T, 6)),
    before(new Date(Date.UTC(T.getUTCFullYear() - 1, 11, 31))),
    before(monthsBack(T, 12)),
    before(monthsBack(T, 36)),
    before(monthsBack(T, 60)),
    before(monthsBack(T, 120)),
  ]);
  const past = Object.fromEntries(PERIODS.map((p, i) => [p, i === 0 ? prev : rest[i - 1]])) as Record<Period, Day | null>;
  const weekly = (await Promise.all(Array.from({ length: 52 }, (_, k) => before(shift(T, -7 * (51 - k)))))).filter((d): d is Day => !!d);

  const rows: IndexReturnRow[] = [];
  for (const family of Object.keys(FAMILY_NAMES) as IndexFamily[]) {
    for (const name of FAMILY_NAMES[family].split(", ")) {
      const k = name.toLowerCase();
      const k2 = ARCHIVE_ALIAS[k] ?? k;
      const cur = latest.close.get(k2);
      if (cur == null) continue;
      const returns = {} as Record<Period, number | null>;
      for (const p of PERIODS) {
        const old = past[p]?.close.get(k2);
        const years = CAGR_YEARS[p];
        returns[p] = old ? ((years ? (cur / old) ** (1 / years) : cur / old) - 1) * 100 : null;
      }
      const spark = weekly.map((w) => w.close.get(k2)).filter((v): v is number => v != null);
      rows.push({ name, family, spark: [...spark.slice(0, -1), cur], returns });
    }
  }
  return { asOf: T.toISOString().slice(0, 10), rows };
}
