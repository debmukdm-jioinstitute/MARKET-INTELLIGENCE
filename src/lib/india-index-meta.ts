/**
 * Canonical slug map for the 26 India benchmark index cards shown on
 * /markets/india ("INDIA BENCHMARKS (NSE / BSE)").
 *
 * Each slug identifies an index for GET /api/indices/[slug]/constituents.
 * Constituent lists come from the official NSE index archives
 * (https://archives.nseindia.com/content/indices/); BSE SENSEX uses a pinned
 * snapshot because BSE publishes no free constituent CSV.
 *
 * IMPORTANT: never derive or display index weights here — there is no free
 * source for them, so they must not be invented.
 */

export type IndiaIndexKind = "nse-csv" | "sensex-pinned" | "no-constituents";

export type IndiaIndexMeta = {
  slug: string;
  /** Human label as shown on the /markets/india card. */
  label: string;
  /** NSE archive CSV filename, or null when the kind does not use one. */
  csvFile: string | null;
  kind: IndiaIndexKind;
};

/**
 * Nifty Midcap Select constituent CSV: verified live 2026-10-07 (HTTP 200,
 * 26 lines = header + 25 constituents, same `Company Name,Industry,Symbol,
 * Series,ISIN Code` format as the other NSE index CSVs).
 * Primary host: https://archives.nseindia.com/content/indices/
 * Fallback (identical file): https://www.niftyindices.com/IndexConstituent/ind_niftymidcapselect_list.csv
 */

export const INDIA_INDEX_META: Record<string, IndiaIndexMeta> = {
  "nifty-50": { slug: "nifty-50", label: "Nifty 50", csvFile: "ind_nifty50list.csv", kind: "nse-csv" },
  "sensex": { slug: "sensex", label: "SENSEX", csvFile: null, kind: "sensex-pinned" },
  "nifty-bank": { slug: "nifty-bank", label: "Nifty Bank", csvFile: "ind_niftybanklist.csv", kind: "nse-csv" },
  "nifty-fin-service": {
    slug: "nifty-fin-service",
    label: "Nifty Fin",
    csvFile: "ind_niftyfinancelist.csv",
    kind: "nse-csv",
  },
  "india-vix": { slug: "india-vix", label: "India VIX", csvFile: null, kind: "no-constituents" },
  "nifty-gs-10y": { slug: "nifty-gs-10y", label: "Nifty GS 10Y", csvFile: null, kind: "no-constituents" },
  "nifty-100": { slug: "nifty-100", label: "Nifty 100", csvFile: "ind_nifty100list.csv", kind: "nse-csv" },
  "nifty-200": { slug: "nifty-200", label: "Nifty 200", csvFile: "ind_nifty200list.csv", kind: "nse-csv" },
  "nifty-500": { slug: "nifty-500", label: "Nifty 500", csvFile: "ind_nifty500list.csv", kind: "nse-csv" },
  "nifty-next-50": {
    slug: "nifty-next-50",
    label: "Nifty Next 50",
    csvFile: "ind_niftynext50list.csv",
    kind: "nse-csv",
  },
  "nifty-midcap-50": {
    slug: "nifty-midcap-50",
    label: "Nifty Midcap 50",
    csvFile: "ind_niftymidcap50list.csv",
    kind: "nse-csv",
  },
  "nifty-smallcap-100": {
    slug: "nifty-smallcap-100",
    label: "Nifty Smallcap",
    // NOTE: the double-l spelling ("smallcap") is the genuine NSE filename.
    csvFile: "ind_niftysmallcap100list.csv",
    kind: "nse-csv",
  },
  "nifty-midcap-select": {
    slug: "nifty-midcap-select",
    label: "Midcap Select",
    csvFile: "ind_niftymidcapselect_list.csv",
    kind: "nse-csv",
  },
  "nifty-it": { slug: "nifty-it", label: "Nifty IT", csvFile: "ind_niftyitlist.csv", kind: "nse-csv" },
  "nifty-pharma": {
    slug: "nifty-pharma",
    label: "Nifty Pharma",
    csvFile: "ind_niftypharmalist.csv",
    kind: "nse-csv",
  },
  "nifty-auto": { slug: "nifty-auto", label: "Nifty Auto", csvFile: "ind_niftyautolist.csv", kind: "nse-csv" },
  "nifty-fmcg": { slug: "nifty-fmcg", label: "Nifty FMCG", csvFile: "ind_niftyfmcglist.csv", kind: "nse-csv" },
  "nifty-metal": {
    slug: "nifty-metal",
    label: "Nifty Metal",
    csvFile: "ind_niftymetallist.csv",
    kind: "nse-csv",
  },
  "nifty-energy": {
    slug: "nifty-energy",
    label: "Nifty Energy",
    csvFile: "ind_niftyenergylist.csv",
    kind: "nse-csv",
  },
  "nifty-realty": {
    slug: "nifty-realty",
    label: "Nifty Realty",
    csvFile: "ind_niftyrealtylist.csv",
    kind: "nse-csv",
  },
  "nifty-pse": { slug: "nifty-pse", label: "Nifty PSE", csvFile: "ind_niftypselist.csv", kind: "nse-csv" },
  "nifty-psu-bank": {
    slug: "nifty-psu-bank",
    label: "Nifty PSU Bank",
    csvFile: "ind_niftypsubanklist.csv",
    kind: "nse-csv",
  },
  "nifty-infra": {
    slug: "nifty-infra",
    label: "Nifty Infra",
    csvFile: "ind_niftyinfralist.csv",
    kind: "nse-csv",
  },
  "nifty-consumption": {
    slug: "nifty-consumption",
    label: "Nifty Consumption",
    csvFile: "ind_niftyconsumptionlist.csv",
    kind: "nse-csv",
  },
  "nifty-media": {
    slug: "nifty-media",
    label: "Nifty Media",
    csvFile: "ind_niftymedialist.csv",
    kind: "nse-csv",
  },
  "nifty-commodities": {
    slug: "nifty-commodities",
    label: "Nifty Commodities",
    csvFile: "ind_niftycommoditieslist.csv",
    kind: "nse-csv",
  },
};

/** Exact human card labels -> canonical slugs (26 entries). */
const LABEL_TO_SLUG: Record<string, string> = {
  "Nifty 50": "nifty-50",
  "SENSEX": "sensex",
  "Nifty Bank": "nifty-bank",
  "Nifty Fin": "nifty-fin-service",
  "India VIX": "india-vix",
  "Nifty GS 10Y": "nifty-gs-10y",
  "Nifty 100": "nifty-100",
  "Nifty 200": "nifty-200",
  "Nifty 500": "nifty-500",
  "Nifty Next 50": "nifty-next-50",
  "Nifty Midcap 50": "nifty-midcap-50",
  "Nifty Smallcap": "nifty-smallcap-100",
  "Midcap Select": "nifty-midcap-select",
  "Nifty IT": "nifty-it",
  "Nifty Pharma": "nifty-pharma",
  "Nifty Auto": "nifty-auto",
  "Nifty FMCG": "nifty-fmcg",
  "Nifty Metal": "nifty-metal",
  "Nifty Energy": "nifty-energy",
  "Nifty Realty": "nifty-realty",
  "Nifty PSE": "nifty-pse",
  "Nifty PSU Bank": "nifty-psu-bank",
  "Nifty Infra": "nifty-infra",
  "Nifty Consumption": "nifty-consumption",
  "Nifty Media": "nifty-media",
  "Nifty Commodities": "nifty-commodities",
};

/** Map an exact /markets/india card label to its canonical slug, or null. */
export function indexSlugFromLabel(label: string): string | null {
  return LABEL_TO_SLUG[label] ?? null;
}

/** All canonical slugs (26). */
export function allIndiaIndexSlugs(): string[] {
  return Object.keys(INDIA_INDEX_META);
}
