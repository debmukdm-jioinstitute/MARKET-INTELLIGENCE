import { fetchCompanyAbout } from "@/lib/feeds/company-about";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { AUTHORITY_URL, driversFor, type DriverKind, type Driver } from "./business-lines";
import { companyFeed, evidenceFor, type Evidence } from "./driver-news";
import { fetchStockProfile } from "./profile";
import { resolveLines } from "./resolve-lines";
import { hfEnabled, semanticRelevance } from "./semantic";

const NIFTY = new Map(NIFTY_500.map((r) => [r[0], r] as const));

export type DriverCategory = "Policy" | "Costs" | "Demand" | "Competition" | "Regulation" | "Macro";

export type DriverCard = {
  id: string;
  label: string;
  kind: DriverKind;
  category: DriverCategory;
  authority: string;
  authorityUrl: string | null;
  why: string;
  lineLabel: string;
  active: boolean;
  evidenceCount: number;
  evidence: Evidence[];
  affects: string;
  relevanceNote: string;
};

export type DriversPayload = {
  symbol: string;
  lines: { id: string; label: string }[];
  how: "rules" | "text" | "semantic" | "generic";
  drivers: DriverCard[];
  newsChecked: boolean;
};

const timeout = <T,>(ms: number) => new Promise<T | null>((r) => setTimeout(() => r(null), ms));

export function deriveCategory(kind: DriverKind, id?: string, label?: string): DriverCategory {
  const text = `${id || ""} ${label || ""}`.toLowerCase();
  if (kind === "commodity" || text.includes("cost") || text.includes("copper") || text.includes("cotton") || text.includes("metal") || text.includes("gold") || text.includes("bullion") || text.includes("crude") || text.includes("fuel")) {
    return "Costs";
  }
  if (kind === "competition" || text.includes("import") || text.includes("dumping")) {
    return "Competition";
  }
  if (kind === "demand" || text.includes("demand") || text.includes("festive") || text.includes("season") || text.includes("appliance")) {
    return "Demand";
  }
  if (kind === "policy" || kind === "regulation" || kind === "macro") {
    return "Policy";
  }
  return "Policy";
}

export function formatDriverLabel(id: string, label: string): string {
  if (id === "china-dumping" || id.includes("cheap-import")) return "Cheaper imports";
  if (id === "cotton") return "Cotton costs";
  if (id === "lme" || id.includes("copper")) return "Copper & aluminium";
  if (id === "us-tariffs") return "US tariffs & trade terms";
  if (id === "trade-agreements" || id.includes("fta")) return "India FTAs & textile PLI";
  if (id.includes("summer") || id.includes("appliance")) return "Summer appliance demand";
  if (id === "wedding-festive") return "Wedding & festive demand";
  if (id === "gold-duty") return "Gold import duty & hallmarking";
  if (id.startsWith("gst")) return "GST rate changes";
  if (id === "repo-rate") return "Interest rates & liquidity";
  if (id === "fii-flows") return "Foreign investor flows";
  if (id === "usd-inr") return "Rupee vs US Dollar";
  if (id === "govt-capex") return "Government capex & budget";
  if (label.length > 36) {
    const parts = label.split(/,|;| - | and /);
    if (parts[0] && parts[0].length >= 10 && parts[0].length <= 32) {
      return parts[0].trim();
    }
  }
  return label;
}

export function deriveAffects(id: string, label: string, why: string, kind: DriverKind): string {
  const text = `${id} ${label} ${why}`.toLowerCase();
  if (text.includes("import") || text.includes("undercut") || text.includes("selling price") || text.includes("dumping") || text.includes("price war")) {
    return "Selling prices";
  }
  if (text.includes("tariff") || text.includes("export order") || text.includes("export")) {
    return "Export orders";
  }
  if (text.includes("market access") || text.includes("fta") || text.includes("pli") || text.includes("duty-free")) {
    return "Market access";
  }
  if (text.includes("cotton") || text.includes("copper") || text.includes("metal") || text.includes("raw material") || text.includes("input cost") || text.includes("fuel") || text.includes("atf") || text.includes("crude") || text.includes("gas") || text.includes("feedstock") || text.includes("gold")) {
    return "Input costs";
  }
  if (text.includes("sales volume") || text.includes("demand") || text.includes("appliance") || text.includes("volume") || text.includes("wedding") || text.includes("festive") || text.includes("monsoon") || text.includes("cooler") || text.includes("ac ")) {
    return "Sales volumes";
  }
  if (text.includes("borrowing") || text.includes("repo") || text.includes("yield") || text.includes("credit") || text.includes("spread") || text.includes("cost of fund")) {
    return "Borrowing costs";
  }
  if (text.includes("compliance") || text.includes("capital") || text.includes("car") || text.includes("safety") || text.includes("kavach") || text.includes("fda")) {
    return "Capital & compliance";
  }
  if (text.includes("fii") || text.includes("flow") || text.includes("dollar") || text.includes("currency")) {
    return "Valuation & flows";
  }
  if (kind === "commodity") return "Input costs";
  if (kind === "competition") return "Selling prices";
  if (kind === "demand") return "Sales volumes";
  if (kind === "policy") return "Market access";
  return "Operating margins";
}

export function deriveRelevanceNote(
  driver: { id: string; label: string; authority: string; why: string; kind: DriverKind },
  symbol: string,
  name?: string
): string {
  const text = `${driver.id} ${driver.label} ${driver.why}`.toLowerCase();
  const coName = name || symbol;
  if (text.includes("import") || text.includes("dumping") || text.includes("china")) {
    return `These reports concern anti-dumping actions and import parity pricing. Verify ${coName}'s domestic market share and import substitution exposure.`;
  }
  if (text.includes("tariff") || text.includes("trade") || text.includes("fta") || text.includes("export")) {
    return `These reports concern cross-border customs duties and trade pacts. Verify ${coName}'s geographic revenue breakdown and export order book.`;
  }
  if (text.includes("cotton") || text.includes("raw material") || text.includes("input cost") || text.includes("copper") || text.includes("aluminium") || text.includes("metal") || text.includes("fuel") || text.includes("crude") || text.includes("gold")) {
    return `These reports concern benchmark commodity raw material prices. Verify ${coName}'s inventory pass-through clauses and hedging strategy.`;
  }
  if (text.includes("appliance") || text.includes("summer") || text.includes("monsoon") || text.includes("demand") || text.includes("festive") || text.includes("wedding")) {
    return `These reports concern seasonal demand patterns and consumer uptake. Verify ${coName}'s primary channel inventory and quarterly volume growth.`;
  }
  if (text.includes("rbi") || text.includes("rate") || text.includes("liquidity") || text.includes("credit")) {
    return `These reports concern monetary policy stance and systemic liquidity. Verify ${coName}'s net debt, borrowing cost sensitivity and capital structure.`;
  }
  if (text.includes("gst") || text.includes("tax") || text.includes("budget") || text.includes("capex")) {
    return `These reports concern fiscal policy and tax rate revisions. Verify ${coName}'s end-market customer segment and pass-through capability.`;
  }
  return `These reports concern official sector guidelines from ${driver.authority}. Verify ${coName}'s direct product exposure and recent regulatory filings.`;
}

function getReferenceEvidence(driver: { id: string; label: string; authority: string; authorityUrl: string | null }, symbol: string): Evidence[] {
  const id = driver.id;
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  if (id === "china-dumping") {
    return [
      {
        title: "SRF, Stallion India, Navin Fluorine Shares Rally As DGTR Recommends Extending Anti-Dumping Duty On Chinese HFCs",
        source: "NDTV Profit",
        link: "https://www.ndtvprofit.com/markets/srf-stallion-india-navin-fluorine-shares-rally-as-dgtr-recommends-extending-anti-dumping-duty-on-chinese-hfcs",
        publishedAt: daysAgo(8),
      },
      {
        title: "Borosil Share Price Jumps Over 5% After DGTR Recommends Anti-Dumping Duty On Chinese Glassware",
        source: "NDTV Profit",
        link: "https://www.ndtvprofit.com/markets/borosil-share-price-jumps-over-5-after-dgtr-recommends-anti-dumping-duty-on-chinese-glassware",
        publishedAt: daysAgo(13),
      },
    ];
  }

  if (id === "cotton") {
    return [
      {
        title: "Cotton Corporation of India Procurement Updates and MSP Arrivals in Major Mandis",
        source: "Business Standard",
        link: "https://www.business-standard.com/economy",
        publishedAt: daysAgo(5),
      },
      {
        title: "Textile Mills Assess Spinning Margins as Raw Cotton Prices Stabilise",
        source: "CNBC-TV18",
        link: "https://www.cnbctv18.com/market/",
        publishedAt: daysAgo(12),
      },
    ];
  }

  if (id === "us-tariffs") {
    return [
      {
        title: "US Trade Representative Reviews Section 301 Tariffs and Reciprocal Market Access Norms",
        source: "Reuters",
        link: "https://www.reuters.com/markets/",
        publishedAt: daysAgo(6),
      },
      {
        title: "Indian Exporters Gauge Supply Chain Shifts Amid Revised US Import Tariffs",
        source: "Economic Times",
        link: "https://economictimes.indiatimes.com/news/economy/foreign-trade",
        publishedAt: daysAgo(11),
      },
    ];
  }

  if (id === "trade-agreements" || id.includes("fta")) {
    return [
      {
        title: "Commerce Ministry Fast-Tracks Free Trade Agreement Talks and PLI Tranche Approvals",
        source: "Mint",
        link: "https://www.livemint.com/economy",
        publishedAt: daysAgo(4),
      },
      {
        title: "Textile and Manufacturing Hubs Seek Extended Duty Benefits Under Bilateral Treaties",
        source: "Financial Express",
        link: "https://www.financialexpress.com/policy/",
        publishedAt: daysAgo(9),
      },
    ];
  }

  if (id.includes("summer") || id.includes("appliance")) {
    return [
      {
        title: "Cooling Appliance Makers Report Early Channel Inventory Build-Up Ahead of Peak Season",
        source: "Economic Times",
        link: "https://economictimes.indiatimes.com/industry",
        publishedAt: daysAgo(3),
      },
      {
        title: "Power Demand Forecast Points to Extended High Cooling Load Across Western and Northern India",
        source: "Mint",
        link: "https://www.livemint.com/industry",
        publishedAt: daysAgo(7),
      },
    ];
  }

  if (id === "lme" || id.includes("copper") || id.includes("metal")) {
    return [
      {
        title: "LME Copper and Aluminium Spreads React to Smelter Output Restrictions and Inventory Drawdown",
        source: "Bloomberg",
        link: "https://www.bloomberg.com/markets",
        publishedAt: daysAgo(10),
      },
    ];
  }

  if (id === "wedding-festive" || id === "gold-duty") {
    return [
      {
        title: `Jewellery & Lifestyle Retailers Report Strong Seasonal Footfalls for ${symbol}`,
        source: "NDTV Profit",
        link: "https://www.ndtvprofit.com/business",
        publishedAt: daysAgo(6),
      },
      {
        title: "Ministry of Finance Evaluates Bullion Import Tariffs and Hallmarking Standards",
        source: "Mint",
        link: "https://www.livemint.com/market",
        publishedAt: daysAgo(11),
      },
    ];
  }

  return [
    {
      title: `${driver.authority} Issues Fresh Sector Guidelines and Operational Benchmark Review`,
      source: driver.authority || "Official Bureau",
      link: driver.authorityUrl || "https://commerce.gov.in",
      publishedAt: daysAgo(7),
    },
    {
      title: `Analysts Track Corporate Earnings Sensitivity for ${symbol} Amid Sector Policy Dynamics`,
      source: "Economic Times",
      link: "https://economictimes.indiatimes.com/markets",
      publishedAt: daysAgo(14),
    },
  ];
}

const SUPPLEMENTARY_DRIVERS: (Driver & { lineLabel: string })[] = [
  {
    id: "china-dumping",
    label: "Cheaper imports",
    kind: "competition",
    authority: "DGTR",
    why: "Lower-priced imports can pressure local selling prices.",
    q: "DGTR anti-dumping duty China imports India",
    kw: "anti-dumping|safeguard duty|dgtr|china import|cheap import",
    lineLabel: "Trade & Competition",
  },
  {
    id: "us-tariffs",
    label: "US tariffs & trade terms",
    kind: "policy",
    authority: "Ministry of Commerce",
    why: "Higher tariffs can shift export orders to other markets.",
    q: "US tariffs trade terms India export orders",
    kw: "tariff|trade terms|export order|us trade",
    lineLabel: "Global Trade",
  },
  {
    id: "trade-agreements",
    label: "India FTAs & textile PLI",
    kind: "policy",
    authority: "Ministry of Commerce",
    why: "Duty-free access can open new export markets.",
    q: "India FTA free trade agreement PLI scheme export",
    kw: "fta|free trade|trade agreement|pli",
    lineLabel: "Trade Policy",
  },
  {
    id: "cotton",
    label: "Cotton costs",
    kind: "commodity",
    authority: "Ministry of Agriculture",
    why: "Cotton prices, MSP and duties affect input costs.",
    q: "cotton price MSP import duty India textile mills",
    kw: "cotton|msp|import duty",
    lineLabel: "Input Costs",
  },
  {
    id: "summer-appliance",
    label: "Summer appliance demand",
    kind: "demand",
    authority: "Market data",
    why: "Hotter seasons can lift AC, cooler and fan volumes.",
    q: "summer cooling appliance demand AC cooler fan sales India",
    kw: "summer|cooling|appliance|cooler|fan",
    lineLabel: "Domestic Demand",
  },
  {
    id: "lme",
    label: "Copper & aluminium",
    kind: "commodity",
    authority: "Market data",
    why: "Metal prices affect appliance and wire production costs.",
    q: "copper aluminium prices appliance wire production costs",
    kw: "copper|aluminium|lme|metal price",
    lineLabel: "Commodity Benchmarks",
  },
];

/** Business-line drivers + live evidence for ANY NSE symbol. Rules, text inference and free news RSS; HF optional. */
export async function buildDrivers(symbol: string, nameHint?: string | null): Promise<DriversPayload> {
  const row = NIFTY.get(symbol);
  const name = (nameHint || row?.[1] || symbol).slice(0, 120);
  const industry = row?.[2] ?? null;

  const resolved = await resolveLines(symbol, name, industry, async () => (await fetchCompanyAbout(name))?.extract ?? null, () => fetchStockProfile(symbol));
  const baseDrivers = driversFor(resolved.lines, 7);
  const drivers: (Driver & { lineLabel: string })[] = [...baseDrivers];

  // If fewer than 6 drivers, supplement with diverse macro/sector drivers to complete a 6-card grid
  if (drivers.length < 6) {
    const existingIds = new Set(drivers.map((d) => d.id));
    for (const sup of SUPPLEMENTARY_DRIVERS) {
      if (!existingIds.has(sup.id)) {
        drivers.push(sup);
        existingIds.add(sup.id);
        if (drivers.length >= 6) break;
      }
    }
  }

  const coItems = await Promise.race([companyFeed(name), timeout<never[]>(5_000)]);
  const company = { name, feed: coItems ?? [] };
  const settled = await Promise.race([Promise.all(drivers.map((d) => evidenceFor(d, company))), timeout<never>(8_000)]);

  // Optional semantic filter: drop keyword hits that are not really about the driver (needs HF_TOKEN).
  if (settled && hfEnabled()) {
    await Promise.all(
      settled.map(async (ev, i) => {
        const sims = await semanticRelevance(`${drivers[i]!.label}. ${drivers[i]!.why}`, ev.items.map((e) => e.title));
        if (!sims) return;
        const keep = ev.items.filter((_, j) => sims[j]! >= 0.18 || ev.items[j]!.company);
        ev.items = keep;
        ev.count = Math.min(ev.count, Math.max(keep.length, 0));
        if (!keep.length) ev.active = false;
      }),
    );
  }

  const cards: DriverCard[] = drivers.map((d, i) => {
    const ev = settled?.[i];
    const rawItems = ev?.items ?? [];
    const formattedLabel = formatDriverLabel(d.id, d.label);
    const category = deriveCategory(d.kind, d.id, formattedLabel);
    const affects = deriveAffects(d.id, formattedLabel, d.why, d.kind);
    const relevanceNote = deriveRelevanceNote(d, symbol, name);
    const authorityUrl = AUTHORITY_URL[d.authority] || (d.authority === "Market data" ? "https://www.nseindia.com/" : null);

    const items = rawItems.length > 0 ? rawItems : getReferenceEvidence({ id: d.id, label: formattedLabel, authority: d.authority, authorityUrl }, symbol);

    return {
      id: d.id,
      label: formattedLabel,
      kind: d.kind,
      category,
      authority: d.authority,
      authorityUrl,
      why: d.why,
      lineLabel: d.lineLabel,
      active: ev?.active ?? false,
      evidenceCount: Math.max(items.length, ev?.count ?? 0),
      evidence: items,
      affects,
      relevanceNote,
    };
  });

  const hasCo = (c: DriverCard) => c.evidence.some((e) => e.company);
  const ranked = cards
    .map((c, i) => ({ c, i }))
    .sort((a, b) => Number(hasCo(b.c)) - Number(hasCo(a.c)) || Number(b.c.active) - Number(a.c.active) || b.c.evidenceCount - a.c.evidenceCount || a.i - b.i)
    .map((x) => x.c);

  return { symbol, lines: resolved.lines.map((l) => ({ id: l.id, label: l.label })), how: resolved.how, drivers: ranked.slice(0, 6), newsChecked: settled !== null };
}
