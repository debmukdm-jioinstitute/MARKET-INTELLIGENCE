import type { BetaPayload, FactorId, SectorId } from "@/lib/transmission/betas";
import { sectorFor } from "@/lib/transmission/sector-map";
import type { Shocks } from "@/lib/transmission/scenario";

/** Where each global driver is analysed on the site (one click away). */
export const DRIVER_META: Record<FactorId, { label: string; short: string; href: string; cta: string; unitNote: string }> = {
  brent: { label: "Brent crude", short: "crude", href: "/macro/commodities", cta: "See crude prices", unitNote: "per +1% in Brent" },
  usdinr: { label: "USD/INR", short: "the rupee", href: "/macro/currency", cta: "See rupee & currency", unitNote: "per +1% in USD/INR" },
  us10y: { label: "US 10Y yield", short: "US yields", href: "/macro/yields", cta: "See yields", unitNote: "per +10bp in US 10Y" },
  spx: { label: "S&P 500", short: "Wall Street", href: "/macro/global", cta: "See global markets", unitNote: "per +1% in S&P 500" },
};

type Profile = { sector: SectorId; drivers: FactorId[]; why: string };

/**
 * Curated exposures for large caps. `drivers` always surface even if the sector regression is noisy;
 * `why` is the plain-language reason shown to the user. Unlisted names fall back to name keywords + sector betas.
 */
const PROFILES: Record<string, Profile> = {
  RELIANCE: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "Refining and petrochemical margins track crude, and a big share of revenue is dollar-linked." },
  ONGC: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "Realisations are tied to crude prices and the rupee." },
  OIL: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "Realisations are tied to crude prices and the rupee." },
  BPCL: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "Marketing margins squeeze when crude rises faster than retail fuel prices." },
  IOC: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "Marketing margins squeeze when crude rises faster than retail fuel prices." },
  HINDPETRO: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "Marketing margins squeeze when crude rises faster than retail fuel prices." },
  GAIL: { sector: "oilgas", drivers: ["brent"], why: "Gas prices and transmission volumes follow crude-linked contracts." },
  PETRONET: { sector: "oilgas", drivers: ["brent", "usdinr"], why: "LNG import costs are crude- and dollar-linked." },
  IGL: { sector: "oilgas", drivers: ["usdinr"], why: "Imported gas cost moves with the rupee." },
  MGL: { sector: "oilgas", drivers: ["usdinr"], why: "Imported gas cost moves with the rupee." },
  INDIGO: { sector: "infra", drivers: ["brent", "usdinr"], why: "Jet fuel is a top cost and most leases and maintenance are in dollars." },
  ASIANPAINT: { sector: "fmcg", drivers: ["brent"], why: "Crude-derived raw materials drive paint input costs." },
  BERGEPAINT: { sector: "fmcg", drivers: ["brent"], why: "Crude-derived raw materials drive paint input costs." },
  PIDILITIND: { sector: "fmcg", drivers: ["brent"], why: "Petrochemical inputs make margins sensitive to crude." },
  TCS: { sector: "it", drivers: ["usdinr", "spx"], why: "Most revenue is in dollars, and client tech budgets follow US markets." },
  INFY: { sector: "it", drivers: ["usdinr", "spx"], why: "Most revenue is in dollars, and client tech budgets follow US markets." },
  WIPRO: { sector: "it", drivers: ["usdinr", "spx"], why: "Most revenue is in dollars, and client tech budgets follow US markets." },
  HCLTECH: { sector: "it", drivers: ["usdinr", "spx"], why: "Most revenue is in dollars, and client tech budgets follow US markets." },
  TECHM: { sector: "it", drivers: ["usdinr", "spx"], why: "Most revenue is in dollars, and client tech budgets follow US markets." },
  LTIM: { sector: "it", drivers: ["usdinr", "spx"], why: "Most revenue is in dollars, and client tech budgets follow US markets." },
  HDFCBANK: { sector: "bank", drivers: ["us10y"], why: "Global yields set foreign-flow appetite and funding costs for banks." },
  ICICIBANK: { sector: "bank", drivers: ["us10y"], why: "Global yields set foreign-flow appetite and funding costs for banks." },
  AXISBANK: { sector: "bank", drivers: ["us10y"], why: "Global yields set foreign-flow appetite and funding costs for banks." },
  KOTAKBANK: { sector: "bank", drivers: ["us10y"], why: "Global yields set foreign-flow appetite and funding costs for banks." },
  SBIN: { sector: "psubank", drivers: ["us10y"], why: "Bond-portfolio valuations and foreign flows react to global yields." },
  TATASTEEL: { sector: "metal", drivers: ["usdinr", "spx"], why: "Steel prices follow global demand, and exports and imported coal are dollar-linked." },
  JSWSTEEL: { sector: "metal", drivers: ["usdinr", "spx"], why: "Steel prices follow global demand, and exports and imported coal are dollar-linked." },
  HINDALCO: { sector: "metal", drivers: ["usdinr", "spx"], why: "Aluminium and copper prices follow global growth and the dollar." },
  VEDL: { sector: "metal", drivers: ["usdinr", "spx"], why: "Base-metal and oil prices follow global growth and the dollar." },
  MARUTI: { sector: "auto", drivers: ["brent", "usdinr"], why: "Fuel prices drive demand and imported components are dollar-linked." },
  TATAMOTORS: { sector: "auto", drivers: ["brent", "usdinr", "spx"], why: "JLR earnings are in pounds and dollars, and fuel prices drive demand." },
  M_M: { sector: "auto", drivers: ["brent"], why: "Fuel prices influence vehicle demand and rural costs." },
  BAJAJ_AUTO: { sector: "auto", drivers: ["brent", "usdinr"], why: "Exports are dollar-linked and fuel prices influence demand." },
  SUNPHARMA: { sector: "pharma", drivers: ["usdinr"], why: "A large share of earnings come from US generics sales." },
  DRREDDY: { sector: "pharma", drivers: ["usdinr"], why: "A large share of earnings come from US generics sales." },
  CIPLA: { sector: "pharma", drivers: ["usdinr"], why: "A large share of earnings come from US generics sales." },
  HINDUNILVR: { sector: "fmcg", drivers: ["brent"], why: "Palm oil and packaging costs are crude-linked." },
  ITC: { sector: "fmcg", drivers: [], why: "Mostly domestic, so global drivers matter less." },
  NESTLEIND: { sector: "fmcg", drivers: ["brent"], why: "Packaging and logistics costs are crude-linked." },
  LT: { sector: "infra", drivers: ["brent", "spx"], why: "Middle East order books and commodity costs follow crude." },
  ULTRACEMCO: { sector: "infra", drivers: ["brent"], why: "Power and freight costs are crude-linked." },
  GRASIM: { sector: "infra", drivers: ["brent"], why: "Chemicals and fuel costs are crude-linked." },
  DLF: { sector: "realty", drivers: ["us10y"], why: "Rate expectations drive housing demand and valuations." },
};

const NAME_RULES: [RegExp, SectorId][] = [
  [/oil|petro|gas|refiner|energy/i, "oilgas"],
  [/psu bank|state bank|bank of (india|baroda)|canara|union bank|punjab national/i, "psubank"],
  [/bank|finance|financial|capital|housing/i, "bank"],
  [/tech|software|infosys|wipro|systems|infotech|digital/i, "it"],
  [/pharma|drug|laborator|biotech/i, "pharma"],
  [/hospital|health|diagnostic/i, "healthcare"],
  [/motor|auto|tyre|tractor|bike/i, "auto"],
  [/steel|metal|alumin|copper|zinc|mining|coal/i, "metal"],
  [/cement|infra|engineer|construct|power|ports/i, "infra"],
  [/realty|real estate|estate|housing dev/i, "realty"],
  [/consumer|foods|beverage|tobacco|fmcg|paint/i, "fmcg"],
];

export function profileFor(symbol: string, name: string): { sector: SectorId; drivers: FactorId[]; why: string | null } {
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const hit = PROFILES[key];
  if (hit) return hit;
  const byName = NAME_RULES.find(([re]) => re.test(name));
  return { sector: byName ? byName[1] : sectorFor(null), drivers: [], why: null };
}

export type DriverNudge = {
  factor: FactorId;
  label: string;
  href: string;
  cta: string;
  /** Measured sector sensitivity (% sector move per unit shock). */
  beta: number;
  significant: boolean;
  direction: "up" | "down";
  /** Today's move in the driver in natural units (% or bp), if known. */
  todayMove: number | null;
  todayUnit: "%" | "bp";
  /** Beta × today's move, in % for the sector. */
  impliedPct: number | null;
  headline: string;
  reason: string | null;
};

const SHOCK_KEY: Record<FactorId, keyof Shocks> = { brent: "brent", usdinr: "usdinr", us10y: "us10y_bp", spx: "spx" };

function todayMoveFor(f: FactorId, shocks: Shocks | null | undefined): number | null {
  const v = shocks?.[SHOCK_KEY[f]];
  return v == null || !Number.isFinite(v) ? null : v;
}

/**
 * Pure, instant ranking of the global drivers a stock leans on. No model calls:
 * curated exposures plus the measured sector betas (|t| >= 2 counts as significant).
 */
export function buildNudges(
  symbol: string,
  name: string,
  betas: BetaPayload | null | undefined,
  shocks: Shocks | null | undefined,
  max = 3,
): { sectorLabel: string | null; nudges: DriverNudge[] } {
  const profile = profileFor(symbol, name);
  const fit = betas?.sectors.find((s) => s.id === profile.sector);
  const nudges: DriverNudge[] = [];

  for (const fac of Object.keys(DRIVER_META) as FactorId[]) {
    const c = fit?.betas[fac];
    const curated = profile.drivers.includes(fac);
    const significant = !!c && Math.abs(c.t) >= 2;
    if (!curated && !significant) continue;
    const beta = c?.beta ?? 0;
    const meta = DRIVER_META[fac];
    const unit: "%" | "bp" = fac === "us10y" ? "bp" : "%";
    const move = todayMoveFor(fac, shocks);
    const betaPerUnit = fac === "us10y" ? beta / 10 : beta; // us10y beta is per +10bp
    const impliedPct = move == null || !c ? null : betaPerUnit * move;
    const direction: "up" | "down" = beta >= 0 ? "up" : "down";
    const lean = direction === "up" ? "rises with" : "falls when";
    const headline = c
      ? `${fit!.label} ${lean} ${meta.short}${direction === "down" ? " rises" : ""}`
      : `Sensitive to ${meta.short}`;
    nudges.push({
      factor: fac,
      label: meta.label,
      href: meta.href,
      cta: meta.cta,
      beta,
      significant,
      direction,
      todayMove: move,
      todayUnit: unit,
      impliedPct,
      headline,
      reason: curated ? profile.why : null,
    });
  }

  // Curated first, then by statistical strength.
  const strength = (n: DriverNudge) => Math.abs(fit?.betas[n.factor]?.t ?? 0) + (profile.drivers.includes(n.factor) ? 100 : 0);
  nudges.sort((a, b) => strength(b) - strength(a));
  return { sectorLabel: fit?.label ?? null, nudges: nudges.slice(0, max) };
}
