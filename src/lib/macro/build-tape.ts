import { fetchFiiDii } from "@/lib/feeds/india/nse-market";
import { fetchIndiaGsec10y } from "@/lib/feeds/india/india-macro";
import { getRbiHomeMarket } from "@/lib/collector/rbi-live";
import { fetchFredSeriesCsv } from "@/lib/feeds/sources/fred";
import { fetchUpstoxIndiaQuotes } from "@/lib/feeds/sources/upstox";
import { fetchYahooQuotes, yahooFinanceUrl } from "@/lib/feeds/sources/yahoo";
import type { FieldSource } from "@/lib/feeds/india/types";
import type { LiveQuote } from "@/lib/feeds/types";
import { COMMODITY_UNIVERSE } from "@/lib/macro/commodity-universe";
import { CURRENCY_UNIVERSE } from "@/lib/macro/currency-universe";

export type YieldPoint = {
  tenor: string;
  label: string;
  value: number | null;
  copyKey: string;
  source: FieldSource;
};

export type TapeQuote = {
  id: string;
  label: string;
  symbol: string;
  price: number | null;
  changePct: number | null;
  copyKey: string;
  href: string;
  source: FieldSource;
};

export type TransmissionRow = {
  name: string;
  direction: "up" | "down" | "mixed";
  symbol?: string;
  href?: string;
};

export type TransmissionBlock = {
  title: string;
  driverLabel: string;
  price: number | null;
  changePct: number | null;
  unit: string;
  copyKey: string;
  beneficiaries: TransmissionRow[];
  pressured: TransmissionRow[];
  source: FieldSource;
};

export type BriefingSeed = {
  fiiNetToday: number | null;
  gsec10y: number | null;
  gsec10yChgPct: number | null;
  itVsNifty1d: number | null;
  brentChgPct: number | null;
  usdInr: number | null;
  usdInrChgPct: number | null;
};

export type MacroTapePayload = {
  fetchedAt: string;
  indiaYieldCurve: YieldPoint[];
  usYieldCurve: YieldPoint[];
  commodities: TapeQuote[];
  currencies: TapeQuote[];
  transmission: { brent: TransmissionBlock; usdInr: TransmissionBlock };
  briefingSeed: BriefingSeed;
};

const US_FRED: { tenor: string; label: string; series: string; copyKey: string }[] = [
  { tenor: "3M", label: "3M", series: "DGS3MO", copyKey: "yield_us_2y" },
  { tenor: "1Y", label: "1Y", series: "DGS1", copyKey: "yield_us_2y" },
  { tenor: "2Y", label: "2Y", series: "DGS2", copyKey: "yield_us_2y" },
  { tenor: "5Y", label: "5Y", series: "DGS5", copyKey: "yield_us_10y" },
  { tenor: "10Y", label: "10Y", series: "DGS10", copyKey: "yield_us_10y" },
  { tenor: "30Y", label: "30Y", series: "DGS30", copyKey: "yield_us_10y" },
];


async function lastFredYield(series: string): Promise<number | null> {
  const pts = await fetchFredSeriesCsv(series);
  const v = pts[pts.length - 1]?.value;
  return v != null && Number.isFinite(v) ? v : null;
}

function yahooSource(sym: string): FieldSource {
  return { provider: "Yahoo Finance", url: yahooFinanceUrl(sym), asOf: new Date().toISOString() };
}

function quoteSource(sym: string, q?: LiveQuote): FieldSource {
  if (q?.provider === "upstox") {
    return {
      provider: "Upstox",
      url: "https://upstox.com/developer/api-documentation/ltp-v3/",
      asOf: q.asOf,
    };
  }
  return yahooSource(sym);
}

export async function buildMacroTape(): Promise<MacroTapePayload> {
  const symbols = [
    ...COMMODITY_UNIVERSE.map((c) => c.sym),
    ...CURRENCY_UNIVERSE.map((c) => c.sym),
    "^NSEI",
    "^CNXIT",
  ];

  const [quotes, upstoxQuotes, gsec, fiiRows, ...usYields] = await Promise.all([
    fetchYahooQuotes(symbols),
    fetchUpstoxIndiaQuotes(["^NSEI"]).catch(() => []),
    fetchIndiaGsec10y(),
    fetchFiiDii().catch(() => []),
    ...US_FRED.map((u) => lastFredYield(u.series)),
  ]);

  const qmap = new Map(quotes.map((q) => [q.symbol, q]));
  for (const u of upstoxQuotes) qmap.set(u.symbol, u);

  // India curve = real RBI-published points (T-bill cut-offs + benchmark G-sec yields from rbi.org.in), no interpolation
  // or assumed spreads. Tenor is remaining maturity rounded to years. Empty if RBI is unreachable.
  const rbiHome = await getRbiHomeMarket();
  const nowYear = new Date().getFullYear();
  const rbiSource = { provider: "Reserve Bank of India (Market Trends)", url: "https://www.rbi.org.in/", asOf: rbiHome?.asOf };
  const tenorOf = (label: string) => {
    if (/91 day/.test(label)) return "3M";
    if (/182 day/.test(label)) return "6M";
    if (/364 day/.test(label)) return "1Y";
    const yr = Number(/(\d{4})$/.exec(label)?.[1]);
    return Number.isFinite(yr) ? `${yr - nowYear}Y` : label;
  };
  const indiaYieldCurve: YieldPoint[] = rbiHome
    ? [...rbiHome.tbills, ...rbiHome.gsecs].map((p) => {
        const tenor = tenorOf(p.label);
        return { tenor, label: /GS (\d{4})/.test(p.label) ? `${tenor} (${/GS (\d{4})/.exec(p.label)![1]})` : tenor, value: p.yield, copyKey: tenor === "10Y" ? "yield_in_10y" : "yield_in_3m", source: rbiSource };
      })
    : [];

  const usYieldCurve: YieldPoint[] = US_FRED.map((row, idx) => ({
    tenor: row.tenor,
    label: row.label,
    value: usYields[idx] ?? null,
    copyKey: row.copyKey,
    source: {
      provider: "FRED",
      url: `https://fred.stlouisfed.org/series/${row.series}`,
      asOf: new Date().toISOString(),
    },
  }));

  const commodities: TapeQuote[] = COMMODITY_UNIVERSE.map((c) => {
    const q = qmap.get(c.sym);
    return {
      id: c.id,
      label: c.label.toUpperCase(),
      symbol: c.sym,
      price: q?.price ?? null,
      changePct: q?.changePct ?? null,
      copyKey: c.copyKey,
      href: `/macro/commodities#${c.id}`,
      source: quoteSource(c.sym, q),
    };
  });

  const currencies: TapeQuote[] = CURRENCY_UNIVERSE.map((c) => {
    const q = qmap.get(c.sym);
    return {
      id: c.id,
      label: c.label.toUpperCase(),
      symbol: c.sym,
      price: q?.price ?? null,
      changePct: q?.changePct ?? null,
      copyKey: c.copyKey,
      href: `/macro/currency#${c.id}`,
      source: quoteSource(c.sym, q),
    };
  });

  const brent = qmap.get("BZ=F");
  const inr = qmap.get("INR=X");
  const nifty = qmap.get("^NSEI");
  const it = qmap.get("^CNXIT");
  const itVsNifty =
    nifty?.changePct != null && it?.changePct != null ? it.changePct - nifty.changePct : null;

  const fiiRow = fiiRows.find((r) => r.category.toUpperCase().includes("FII"));
  const fiiNet = fiiRow?.netValue ? Number(String(fiiRow.netValue).replace(/,/g, "")) : null;

  const brentUp = (brent?.changePct ?? 0) > 0.005;
  const brentDown = (brent?.changePct ?? 0) < -0.005;
  const inrWeak = (inr?.changePct ?? 0) > 0.002;

  const transmission = {
    brent: {
      title: "Commodity → India transmission",
      driverLabel: "BRENT",
      price: brent?.price ?? null,
      changePct: brent?.changePct ?? null,
      unit: "USD/bbl",
      copyKey: "brent",
      beneficiaries: [
        { name: "ONGC", direction: (brentUp ? "up" : brentDown ? "down" : "mixed") as TransmissionRow["direction"], symbol: "ONGC", href: "/research/ONGC" },
        { name: "Oil & gas E&P", direction: (brentUp ? "up" : "mixed") as TransmissionRow["direction"], href: "/macro/commodities#brent" },
      ],
      pressured: [
        { name: "IOC", direction: "mixed" as TransmissionRow["direction"], symbol: "IOC", href: "/research/IOC" },
        { name: "BPCL", direction: "mixed" as TransmissionRow["direction"], symbol: "BPCL", href: "/research/BPCL" },
        { name: "HPCL", direction: "mixed" as TransmissionRow["direction"], symbol: "HPCL", href: "/research/HPCL" },
        { name: "Paints", direction: (brentUp ? "down" : brentDown ? "up" : "mixed") as TransmissionRow["direction"] },
        { name: "Airlines", direction: (brentUp ? "down" : brentDown ? "up" : "mixed") as TransmissionRow["direction"] },
        { name: "Chemicals", direction: (brentUp ? "down" : "mixed") as TransmissionRow["direction"] },
      ],
      source: quoteSource("BZ=F", brent),
    },
    usdInr: {
      title: "FX → India transmission",
      driverLabel: "USD/INR",
      price: inr?.price ?? null,
      changePct: inr?.changePct ?? null,
      unit: "INR",
      copyKey: "usd_inr",
      beneficiaries: [
        { name: "IT services", direction: (inrWeak ? "up" : "mixed") as TransmissionRow["direction"], href: "/research/TCS" },
        { name: "Pharma exporters", direction: (inrWeak ? "up" : "mixed") as TransmissionRow["direction"], href: "/research/SUNPHARMA" },
      ],
      pressured: [
        { name: "Import-heavy businesses", direction: (inrWeak ? "down" : "mixed") as TransmissionRow["direction"] },
        { name: "Airlines", direction: (inrWeak ? "down" : "mixed") as TransmissionRow["direction"] },
      ],
      source: quoteSource("INR=X", inr),
    },
  };

  return {
    fetchedAt: new Date().toISOString(),
    indiaYieldCurve,
    usYieldCurve,
    commodities,
    currencies,
    transmission,
    briefingSeed: {
      fiiNetToday: Number.isFinite(fiiNet) ? fiiNet : null,
      gsec10y: gsec.field.value,
      gsec10yChgPct: gsec.field.changePct ?? null,
      itVsNifty1d: itVsNifty,
      brentChgPct: brent?.changePct ?? null,
      usdInr: inr?.price ?? null,
      usdInrChgPct: inr?.changePct ?? null,
    },
  };
}
