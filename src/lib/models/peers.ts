/**
 * Peer set: bottom-up (unlevered) beta and trading multiples.
 *
 * `buildPeerRow` / `summarizePeers` are pure and unit-tested; `fetchPeerSet`
 * is the best-effort Yahoo wrapper (peers come from Yahoo's "similar
 * companies" list, restricted to the target's own exchange so the beta
 * regression benchmark is the same index).
 */
import { MINOR_UNITS } from "@/lib/models/field-map";
import { alignMonthly, fetchChart, fetchFxRate, fetchMonthlySeries, getJson, indexForSymbol } from "@/lib/models/yahoo-fundamentals";
import { linreg, median, monthlyReturns } from "@/lib/models/stats";
import type { PeerRow, PeerSet, PriceSeries } from "@/lib/models/types";

export type PeerInputs = {
  symbol: string;
  name: string;
  price: number;
  shares: number;
  debt: number;
  cash: number;
  ebitda: number | null;
  revenue: number | null;
  netIncome: number | null;
  equity: number | null;
  taxRate: number;
  rawBeta: number;
};

export function buildPeerRow(i: PeerInputs): PeerRow | null {
  const marketCap = i.price * i.shares;
  if (!(marketCap > 0) || !Number.isFinite(i.rawBeta)) return null;
  const leveredBeta = 0.67 * i.rawBeta + 0.33;
  const isBankOrLender = (i.debt / marketCap) > 3;
  const de = isBankOrLender ? Math.min(1.5, Math.max(0, i.debt) / marketCap) : Math.max(0, i.debt) / marketCap;
  const unleveredBeta = leveredBeta / (1 + (1 - i.taxRate) * (isBankOrLender ? 0.3 : de));
  // For banks and financial lenders, customer deposits/borrowings are operating liabilities rather than enterprise debt.
  const ev = isBankOrLender ? marketCap : marketCap + i.debt - i.cash;
  const pos = (n: number | null) => (n != null && n > 0 ? n : null);
  const ebitdaVal = pos(i.ebitda);
  return {
    symbol: i.symbol,
    name: i.name,
    marketCap,
    enterpriseValue: ev,
    evEbitda: ebitdaVal ? ev / ebitdaVal : null,
    evSales: pos(i.revenue) ? ev / i.revenue! : null,
    pe: pos(i.netIncome) ? marketCap / i.netIncome! : null,
    pb: pos(i.equity) ? marketCap / i.equity! : null,
    leveredBeta,
    unleveredBeta,
    debtToEquity: de,
  };
}

export function summarizePeers(peers: PeerRow[], source: string): PeerSet | null {
  if (!peers.length) return null;
  const sane = (v: number | null, hi: number) => (v != null && v > 0 && v < hi ? v : NaN);
  return {
    peers,
    // a median of fewer than 3 betas is not a bottom-up estimate — callers fall back to regression
    medianUnleveredBeta: peers.length >= 3 ? median(peers.map((p) => p.unleveredBeta)) : null,
    medianLeveredBeta: peers.length >= 3 ? median(peers.map((p) => p.leveredBeta)) : null,
    medians: {
      evEbitda: median(peers.map((p) => sane(p.evEbitda, 80))),
      evSales: median(peers.map((p) => sane(p.evSales, 60))),
      pe: median(peers.map((p) => sane(p.pe, 200))),
      pb: median(peers.map((p) => sane(p.pb, 60))),
    },
    source,
  };
}

type TsResult = { meta?: { type?: string[] }; [k: string]: unknown };

async function fetchPeerFinancials(symbol: string) {
  const annual = [
    "OrdinarySharesNumber",
    "TotalDebt",
    "CashCashEquivalentsAndShortTermInvestments",
    "StockholdersEquity",
    "TaxProvision",
    "PretaxIncome",
    "EBITDA",
    "TotalRevenue",
    "NetIncome",
    "OperatingIncome",
    "NormalizedEBITDA",
    "EBIT",
    "ReconciledDepreciation",
  ];
  const trailing = [
    "EBITDA",
    "TotalRevenue",
    "NetIncome",
    "OperatingIncome",
    "NormalizedEBITDA",
    "EBIT",
    "PretaxIncome",
  ];
  const now = Math.floor(Date.now() / 1000);
  const js = await getJson<{ timeseries?: { result?: TsResult[] } }>(
    `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`,
    {
      type: [...annual.map((t) => "annual" + t), ...trailing.map((t) => "trailing" + t)].join(","),
      period1: String(now - 3 * 366 * 86400),
      period2: String(now + 86400),
      merge: "false",
    },
    12_000,
  );
  const latest = new Map<string, number>();
  const currency = new Map<string, number>();
  for (const r of js?.timeseries?.result ?? []) {
    const t = r.meta?.type?.[0];
    if (!t) continue;
    const rows = ((r[t] as { asOfDate: string; currencyCode?: string; reportedValue?: { raw?: number } }[] | undefined) ?? [])
      .filter((v) => v?.reportedValue?.raw != null)
      .sort((a, b) => a.asOfDate.localeCompare(b.asOfDate));
    const last = rows[rows.length - 1];
    if (last) {
      latest.set(t, Number(last.reportedValue!.raw));
      if (last.currencyCode) currency.set(last.currencyCode, (currency.get(last.currencyCode) ?? 0) + 1);
    }
  }
  const g = (k: string) => latest.get(k) ?? null;
  const statementCurrency = [...currency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { g, statementCurrency };
}

const suffixOf = (s: string) => (s.includes(".") ? s.split(".").pop()!.toUpperCase() : "");
const indexCache = new Map<string, Promise<PriceSeries>>();

async function fetchOnePeer(symbol: string, index: PriceSeries | null): Promise<PeerRow | null> {
  // a peer on a different exchange is regressed against ITS OWN market index (betas are only comparable within a market)
  if (!index) {
    const idx = indexForSymbol(symbol);
    if (!indexCache.has(idx.symbol)) indexCache.set(idx.symbol, fetchMonthlySeries(idx.symbol, idx.name));
    index = await indexCache.get(idx.symbol)!;
  }
  const [chart, monthly, fin] = await Promise.all([
    fetchChart(symbol, "5d", "1d"),
    fetchMonthlySeries(symbol, symbol),
    fetchPeerFinancials(symbol),
  ]);
  let price = Number(chart.meta?.regularMarketPrice);
  let listingCcy = chart.meta?.currency;
  const minor = listingCcy ? MINOR_UNITS[listingCcy] : undefined; // e.g. GBp (pence) -> GBP
  if (minor) {
    price /= minor[1];
    listingCcy = minor[0];
  }
  if (!(price > 0) || !fin.statementCurrency || !listingCcy) return null;
  // ADRs / dual reporters (e.g. CHF-listed, USD-reporting): convert the price into the statement currency
  if (listingCcy !== fin.statementCurrency) {
    const fx = await fetchFxRate(listingCcy, fin.statementCurrency);
    if (fx == null) return null;
    price *= fx;
  }
  const shares = fin.g("annualOrdinarySharesNumber");
  if (!shares) return null;
  const [s, ix] = alignMonthly(monthly, index);
  const reg = linreg(monthlyReturns(s.closes), monthlyReturns(ix.closes));
  if (reg.n < 24 || reg.slope < -1 || reg.slope > 4) return null;
  const pretax = fin.g("annualPretaxIncome");
  const tax = fin.g("annualTaxProvision");
  const taxRate = pretax && pretax > 0 && tax != null ? Math.min(0.35, Math.max(0.1, tax / pretax)) : 0.25;
  const rawEbitda =
    fin.g("trailingEBITDA") ??
    fin.g("annualEBITDA") ??
    fin.g("trailingNormalizedEBITDA") ??
    fin.g("annualNormalizedEBITDA") ??
    fin.g("trailingOperatingIncome") ??
    fin.g("annualOperatingIncome") ??
    fin.g("trailingPretaxIncome") ??
    fin.g("annualPretaxIncome");

  return buildPeerRow({
    symbol,
    name: chart.meta?.longName ?? chart.meta?.shortName ?? symbol,
    price,
    shares,
    debt: fin.g("annualTotalDebt") ?? 0,
    cash: fin.g("annualCashCashEquivalentsAndShortTermInvestments") ?? 0,
    ebitda: rawEbitda,
    revenue: fin.g("trailingTotalRevenue") ?? fin.g("annualTotalRevenue"),
    netIncome: fin.g("trailingNetIncome") ?? fin.g("annualNetIncome"),
    equity: fin.g("annualStockholdersEquity"),
    taxRate,
    rawBeta: reg.slope,
  });
}

import { NIFTY_500 } from "@/lib/prowess/nifty500";

export const SECTOR_PEER_CLUSTERS: Record<string, { name: string; symbols: string[] }> = {
  BANKING: {
    name: "Banking",
    symbols: [
      "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK",
      "BANKBARODA", "PNB", "INDUSINDBK", "CANBK", "IDFCFIRSTB",
      "FEDERALBNK", "UNIONBANK", "INDIANB", "YESBANK", "AUBANK",
      "BANDHANBNK", "RBLBANK", "CENTRALBK", "IOB", "UCOBANK",
      "MAHABANK", "J&KBANK", "KARURVYSYA", "CUB",
    ],
  },
  FINANCIAL_SERVICES: {
    name: "NBFC & Financial Services",
    symbols: [
      "BAJFINANCE", "BAJAJFINSV", "CHOLAFIN", "SHRIRAMFIN", "MUTHOOTFIN",
      "M&MFIN", "SUNDARMFIN", "POONAWALLA", "LICHSGFIN", "PNBHOUSING",
      "AAVAS", "CANFINHOME", "HOMEFIRST", "APTUS", "ABCAPITAL", "JIOFIN",
      "HDFCAMC", "NAM-INDIA", "UTIAMC", "CDSL", "BSE", "MCX", "ANGELONE",
      "MOTILALOFS", "ANANDRATHI", "NUVAMA", "CRISIL", "CAMS", "KFINTECH",
    ],
  },
  INSURANCE: {
    name: "Insurance",
    symbols: [
      "LICI", "HDFCLIFE", "SBILIFE", "ICICIPRULI", "ICICIGI",
      "GICRE", "NIACL", "STARHEALTH", "GODIGIT", "NIVABUPA",
    ],
  },
  IT_SERVICES: {
    name: "Information Technology",
    symbols: [
      "TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM", "LTM",
      "PERSISTENT", "COFORGE", "MPHASIS", "KPITTECH", "OFSS", "CYIENT",
      "TATAELXSI", "TATATECH", "BSOFT", "SONATSOFTW", "ZENSARTECH", "NEWGEN",
      "NETWEB", "AFFLE", "MAPMYINDIA", "LATENTVIEW", "FSL", "ECLERX", "SAGILITY",
    ],
  },
  OIL_GAS_ENERGY: {
    name: "Oil, Gas & Energy",
    symbols: [
      "RELIANCE", "ONGC", "IOC", "BPCL", "HINDPETRO", "GAIL", "OIL",
      "PETRONET", "MRPL", "ATGL", "MGL", "IGL", "GUJGASLTD", "CHENNPETRO",
      "CASTROLIND", "AEGISLOG", "AEGISVOPAK",
    ],
  },
  AUTOMOBILE: {
    name: "Automobile & Auto Components",
    symbols: [
      "MARUTI", "TATAMOTORS", "TMCV", "TMPV", "M&M", "BAJAJ-AUTO", "EICHERMOT",
      "HEROMOTOCO", "TVSMOTOR", "ASHOKLEY", "BHARATFORG", "BOSCHLTD", "MOTHERSON",
      "MSUMI", "SONACOMS", "TIINDIA", "UNOMINDA", "BALKRISIND", "APOLLOTYRE",
      "MRF", "CEATLTD", "JKTYRE", "EXIDEIND", "AMARAJA", "ARE&M", "ENDURANCE",
      "CIEINDIA", "SCHAEFFLER", "TIMKEN", "CRAFTSMAN", "FORCEMOT", "HYUNDAI",
      "OLAELEC", "OLECTRA", "JBMA",
    ],
  },
  PHARMACEUTICALS: {
    name: "Pharmaceuticals & Healthcare",
    symbols: [
      "SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP", "LUPIN",
      "AUROPHARMA", "TORNTPHARM", "ZYDUSLIFE", "MANKIND", "BIOCON", "ALKEM",
      "MAXHEALTH", "FORTIS", "MEDANTA", "NH", "ASTERDM", "KIMS", "RAINBOW",
      "GLENMARK", "IPCALAB", "AJANTPHARM", "PPLPHARMA", "GLAND", "LAURUSLABS",
      "SYNGENE", "NEULANDLAB", "NATCOPHARM", "GRANULES", "ERIS", "CAPLIPOINT",
      "LALPATHLAB", "VIJAYA", "COHANCE", "ANTHEM", "SAILIFE", "WOCKPHARMA",
    ],
  },
  FMCG: {
    name: "Fast Moving Consumer Goods",
    symbols: [
      "HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "TATACONSUM", "DABUR",
      "MARICO", "GODREJCP", "COLPAL", "VBL", "PATANJALI", "EMAMILTD",
      "ZYDUSWELL", "BIKAJI", "HONASA", "RADICO", "UNITDSPR", "UBL",
      "GODFRYPHLP", "GILLETTE", "CCL", "LTFOODS", "BALRAMCHIN", "AWL",
    ],
  },
  METALS_MINING: {
    name: "Metals & Mining",
    symbols: [
      "TATASTEEL", "JSWSTEEL", "HINDALCO", "JINDALSTEL", "VEDL", "COALINDIA",
      "NMDC", "NATIONALUM", "SAIL", "JSL", "HINDZINC", "HINDCOPPER", "GMDCLTD",
      "GRAVITA", "LLOYDSME", "SHYAMMETL", "SARDAEN", "NSLNISP", "ADANIENT",
    ],
  },
  CAPITAL_GOODS: {
    name: "Capital Goods & Engineering",
    symbols: [
      "LT", "SIEMENS", "ABB", "BHEL", "BEL", "HAL", "CUMMINSIND", "THERMAX",
      "SUZLON", "GVT&D", "MAZDOCK", "COCHINSHIP", "GRSE", "BDL", "AIAENG",
      "APARINDS", "KEI", "POLYCAB", "RRKABEL", "FINCABLES", "CGPOWER", "KAYNES",
      "SYRMA", "DATAPATTNS", "ZENTEC", "TITAGARH", "JWL", "BEML", "ASTRAL",
      "SUPREMEIND", "CARBORUNIV", "KEC", "KPIL", "TRITURBINE", "ENRIN", "RHIM",
    ],
  },
  CEMENT_MATERIALS: {
    name: "Cement & Construction Materials",
    symbols: [
      "ULTRACEMCO", "GRASIM", "AMBUJACEM", "ACC", "SHREECEM", "DALBHARAT",
      "JKCEMENT", "RAMCOCEM", "NUVOCO", "INDIACEM", "JSWCEMENT",
    ],
  },
  POWER_ENERGY: {
    name: "Power & Utilities",
    symbols: [
      "NTPC", "POWERGRID", "TATAPOWER", "ADANIGREEN", "ADANIPOWER", "ADANIENSOL",
      "JSWENERGY", "NHPC", "SJVN", "TORNTPOWER", "CESC", "JPPOWER", "RPOWER",
      "NLCINDIA", "WAAREEENER", "PREMIERENE", "ACMESOLAR", "NTPCGREEN", "NAVA",
    ],
  },
  TELECOMMUNICATION: {
    name: "Telecommunication",
    symbols: [
      "BHARTIARTL", "INDUSTOWER", "IDEA", "TATACOMM", "BHARTIHEXA", "HFCL",
      "TEJASNET", "ITI", "RAILTEL", "TTML",
    ],
  },
  CHEMICALS: {
    name: "Chemicals",
    symbols: [
      "PIDILITIND", "SRF", "DEEPAKNTR", "AARTIIND", "TATACHEM", "PIIND", "UPL",
      "FLUOROCHEM", "NAVINFLUOR", "CLEAN", "ATUL", "COROMANDEL", "CHAMBLFERT",
      "DEEPAKFERT", "FACT", "SUMICHEM", "BAYERCROP", "HSCL", "PCBL", "SOLARINDS",
      "ANURAS", "JUBLINGREA", "SWANCORP",
    ],
  },
  REALTY: {
    name: "Realty & Real Estate",
    symbols: [
      "DLF", "GODREJPROP", "LODHA", "OBEROIRLTY", "PRESTIGE", "PHOENIXLTD",
      "BRIGADE", "SOBHA", "SIGNATURE", "ANANTRAJ", "ABREL",
    ],
  },
  CONSUMER_RETAIL: {
    name: "Consumer Durables & Retail",
    symbols: [
      "TITAN", "TRENT", "DMART", "HAVELLS", "VOLTAS", "DIXON", "CROMPTON",
      "ASIANPAINT", "BERGEPAINT", "KALYANKJIL", "PAGEIND", "BATAINDIA",
      "BLUESTARCO", "WHIRLPOOL", "AMBER", "PGEL", "ABFRL", "NYKAA", "SWIGGY",
      "ETERNAL", "DEVYANI", "JUBLFOOD", "SAPPHIRE", "INDHOTEL", "EIHOTEL",
      "LEMONTREE", "CHALET", "FIRSTCRY", "MEESHO", "VMM",
    ],
  },
  INFRA_LOGISTICS: {
    name: "Infrastructure & Logistics",
    symbols: [
      "ADANIPORTS", "CONCOR", "DELHIVERY", "BLUEDART", "INDIGO", "GESHIP",
      "SCI", "JSWINFRA", "GMRAIRPORT", "IRCTC", "IRB", "IRCON", "RVNL", "RITES",
      "NBCC", "NCC", "CEMPRO", "ENGINERSIN", "AFCONS",
    ],
  },
};

export const GLOBAL_PEER_CLUSTERS: Record<string, { name: string; symbols: string[] }> = {
  US_BIG_TECH: {
    name: "Big Tech & Software",
    symbols: ["AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "NVDA", "AVGO", "ADBE", "CRM", "ORCL", "CSCO", "IBM", "INTC", "AMD", "QCOM"],
  },
  US_BANKING: {
    name: "Banking & Financial Services",
    symbols: ["JPM", "BAC", "WFC", "C", "MS", "GS", "USB", "PNC", "TFC", "BLK", "SCHW", "AXP", "V", "MA", "COF"],
  },
  US_HEALTHCARE: {
    name: "Healthcare & Pharmaceuticals",
    symbols: ["JNJ", "PFE", "MRK", "ABBV", "LLY", "BMY", "AMGN", "GILD", "UNH", "CVS", "ELV", "TMO", "ABT", "DHR"],
  },
  US_ENERGY: {
    name: "Energy & Oil",
    symbols: ["XOM", "CVX", "COP", "SLB", "EOG", "OXY", "MPC", "PSX", "VLO", "HAL", "KMI", "WMB"],
  },
  US_AUTO: {
    name: "Automotive",
    symbols: ["TSLA", "F", "GM", "RIVN", "LCID", "TM", "HMC", "STLA", "RACE"],
  },
  US_RETAIL_CONSUMER: {
    name: "Consumer & Retail",
    symbols: ["WMT", "TGT", "COST", "HD", "LOW", "NKE", "MCD", "SBUX", "PG", "KO", "PEP", "PM", "MO"],
  },
  US_INDUSTRIALS_AERO: {
    name: "Industrials & Aerospace",
    symbols: ["CAT", "DE", "GE", "HON", "BA", "RTX", "LMT", "GD", "NOC", "EMR", "ETN", "ITW", "PH"],
  },
};

export function getPeerCandidatesForSymbol(
  symbol: string,
  sectorInfo?: { sector: string | null; industry: string | null } | null,
): { candidates: string[]; groupName: string } {
  const hasDot = symbol.includes(".");
  const explicitSuffix = hasDot ? "." + symbol.split(".").pop() : "";
  const bare = symbol.replace(/\.[A-Za-z0-9_-]+$/, "").toUpperCase();

  // 1. Check Indian curated sector clusters
  for (const cluster of Object.values(SECTOR_PEER_CLUSTERS)) {
    if (cluster.symbols.includes(bare)) {
      const sfx = explicitSuffix || ".NS";
      const candidates = cluster.symbols
        .filter((s) => s !== bare)
        .slice(0, 6)
        .map((s) => `${s}${sfx}`);
      return { candidates, groupName: cluster.name };
    }
  }

  // 2. Check Global curated clusters
  for (const cluster of Object.values(GLOBAL_PEER_CLUSTERS)) {
    if (cluster.symbols.includes(bare)) {
      const candidates = cluster.symbols
        .filter((s) => s !== bare)
        .slice(0, 6)
        .map((s) => (explicitSuffix ? `${s}${explicitSuffix}` : s));
      return { candidates, groupName: cluster.name };
    }
  }

  // 3. Check NIFTY_500 classification for Indian stocks
  const niftyEntry = NIFTY_500.find((row) => row[0].toUpperCase() === bare);
  if (niftyEntry) {
    const sector = niftyEntry[2];
    const sfx = explicitSuffix || ".NS";
    const sameSectorSymbols = NIFTY_500
      .filter((row) => row[2] === sector && row[0].toUpperCase() !== bare)
      .slice(0, 6)
      .map((row) => `${row[0]}${sfx}`);
    if (sameSectorSymbols.length > 0) {
      return { candidates: sameSectorSymbols, groupName: sector };
    }
  }

  // 4. Fallback to sectorInfo if available
  const group = sectorInfo?.industry || sectorInfo?.sector || "Industry";
  return { candidates: [], groupName: group };
}

/** Fetches up to 6 same-industry peers and summarises beta + multiples. */
export async function fetchPeerSet(
  symbol: string,
  index: PriceSeries,
  _currency: string,
  sectorInfo?: { sector: string | null; industry: string | null } | null,
): Promise<PeerSet | null> {
  void _currency;
  const suffix = suffixOf(symbol);

  // 1. Resolve candidates using pure-industry clusters
  const { candidates: directCandidates, groupName } = getPeerCandidatesForSymbol(symbol, sectorInfo);

  let candidates = directCandidates;

  // 2. Fallback to Yahoo similar companies only if no curated candidates exist
  if (!candidates.length) {
    try {
      const rec = await getJson<{ finance?: { result?: { recommendedSymbols?: { symbol: string }[] }[] } }>(
        `/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`,
        {},
        8_000,
      );
      const all = (rec?.finance?.result?.[0]?.recommendedSymbols ?? []).map((r) => r.symbol).filter((s) => s && s !== symbol);
      const same = all.filter((s) => suffixOf(s) === suffix);
      const others = all.filter((s) => suffixOf(s) !== suffix);
      candidates = [...same, ...(same.length < 4 ? others : [])].slice(0, 6);
    } catch {
      candidates = [];
    }
  }

  if (!candidates.length) return null;

  const settled = await Promise.allSettled(candidates.map((c) => fetchOnePeer(c, suffixOf(c) === suffix ? index : null)));
  const rows = settled.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  if (!rows.length) return null;

  return summarizePeers(
    rows,
    `Industry peer set (${groupName}), TTM multiples, Blume-adjusted & unlevered peer betas`,
  );
}
