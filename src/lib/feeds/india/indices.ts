/**
 * NSE/BSE benchmark indices for feed hub + India markets page.
 * Yahoo symbol is primary fetch key; Upstox instrument_key when listed (live session).
 */

export type IndiaBenchmarkDef = {
  yahoo: string;
  label: string;
  name: string;
  upstoxKey?: string;
  trueData?: string;
};

export const INDIA_BENCHMARK_DEFS: readonly IndiaBenchmarkDef[] = [
  { yahoo: "^NSEI", label: "Nifty 50", name: "Nifty 50 · NSE", upstoxKey: "NSE_INDEX|Nifty 50", trueData: "NIFTY 50" },
  { yahoo: "^BSESN", label: "SENSEX", name: "S&P BSE SENSEX", upstoxKey: "BSE_INDEX|SENSEX", trueData: "SENSEX" },
  { yahoo: "^NSEBANK", label: "Nifty Bank", name: "Nifty Bank · NSE", upstoxKey: "NSE_INDEX|Nifty Bank", trueData: "NIFTY BANK" },
  { yahoo: "^CNXFIN", label: "Nifty Fin", name: "Nifty Financial Services · NSE", upstoxKey: "NSE_INDEX|Nifty Fin Service" },
  { yahoo: "^INDIAVIX", label: "India VIX", name: "India VIX · NSE", upstoxKey: "NSE_INDEX|India VIX" },
  { yahoo: "^NIFTYGS10Y", label: "Nifty GS 10Y", name: "Nifty 10Y G-Sec · NSE", upstoxKey: "NSE_INDEX|Nifty GS 10Yr" },

  { yahoo: "^CNX100", label: "Nifty 100", name: "Nifty 100 · NSE", upstoxKey: "NSE_INDEX|Nifty 100" },
  { yahoo: "^CNX200", label: "Nifty 200", name: "Nifty 200 · NSE", upstoxKey: "NSE_INDEX|Nifty 200" },
  { yahoo: "^CNX500", label: "Nifty 500", name: "Nifty 500 · NSE", upstoxKey: "NSE_INDEX|Nifty 500" },
  { yahoo: "^CNXNEXT50", label: "Nifty Next 50", name: "Nifty Next 50 · NSE", upstoxKey: "NSE_INDEX|Nifty Next 50" },
  { yahoo: "^NSMIDCP", label: "Nifty Midcap 50", name: "Nifty Midcap 50 · NSE", upstoxKey: "NSE_INDEX|Nifty Midcap 50" },
  { yahoo: "^CNXMIDCAP", label: "Nifty Midcap 100", name: "Nifty Midcap 100 · NSE", upstoxKey: "NSE_INDEX|Nifty Midcap 100" },
  { yahoo: "^CNXSC", label: "Nifty Smallcap", name: "Nifty Smallcap 100 · NSE", upstoxKey: "NSE_INDEX|Nifty Smallcap 100" },
  { yahoo: "NIFTY_MID_SELECT.NS", label: "Midcap Select", name: "Nifty Midcap Select · NSE" },

  { yahoo: "^CNXIT", label: "Nifty IT", name: "Nifty IT · NSE", upstoxKey: "NSE_INDEX|Nifty IT" },
  { yahoo: "^CNXPHARMA", label: "Nifty Pharma", name: "Nifty Pharma · NSE", upstoxKey: "NSE_INDEX|Nifty Pharma" },
  { yahoo: "^CNXAUTO", label: "Nifty Auto", name: "Nifty Auto · NSE", upstoxKey: "NSE_INDEX|Nifty Auto" },
  { yahoo: "^CNXFMCG", label: "Nifty FMCG", name: "Nifty FMCG · NSE", upstoxKey: "NSE_INDEX|Nifty FMCG" },
  { yahoo: "^CNXMETAL", label: "Nifty Metal", name: "Nifty Metal · NSE", upstoxKey: "NSE_INDEX|Nifty Metal" },
  { yahoo: "^CNXENERGY", label: "Nifty Energy", name: "Nifty Energy · NSE", upstoxKey: "NSE_INDEX|Nifty Energy" },
  { yahoo: "^CNXREALTY", label: "Nifty Realty", name: "Nifty Realty · NSE", upstoxKey: "NSE_INDEX|Nifty Realty" },
  { yahoo: "^CNXPSE", label: "Nifty PSE", name: "Nifty PSE · NSE", upstoxKey: "NSE_INDEX|Nifty PSE" },
  { yahoo: "^CNXPSUBANK", label: "Nifty PSU Bank", name: "Nifty PSU Bank · NSE", upstoxKey: "NSE_INDEX|Nifty PSU Bank" },
  { yahoo: "^CNXPVTBNK", label: "Nifty Pvt Bank", name: "Nifty Private Bank · NSE", upstoxKey: "NSE_INDEX|Nifty Private Bank" },
  { yahoo: "^CNXINFRA", label: "Nifty Infra", name: "Nifty Infrastructure · NSE", upstoxKey: "NSE_INDEX|Nifty Infra" },
  { yahoo: "^CNXCONSUM", label: "Nifty Consumption", name: "Nifty India Consumption · NSE", upstoxKey: "NSE_INDEX|Nifty Consumption" },
  { yahoo: "^CNXMEDIA", label: "Nifty Media", name: "Nifty Media · NSE", upstoxKey: "NSE_INDEX|Nifty Media" },
  { yahoo: "^CNXCMDT", label: "Nifty Commodities", name: "Nifty Commodities · NSE", upstoxKey: "NSE_INDEX|Nifty Commodities" },
  { yahoo: "^CNXHEALTH", label: "Nifty Healthcare", name: "Nifty Healthcare · NSE", upstoxKey: "NSE_INDEX|Nifty Healthcare" },
  { yahoo: "^CNXFINANCE", label: "Nifty Financial Svcs", name: "Nifty Financial Services 25/50 · NSE" },
  { yahoo: "^CNXMANUF", label: "Nifty Mfg", name: "Nifty India Manufacturing · NSE" },

  { yahoo: "^BSE100", label: "BSE 100", name: "BSE 100", upstoxKey: "BSE_INDEX|BSE 100" },
  { yahoo: "^BSE200", label: "BSE 200", name: "BSE 200" },
  { yahoo: "^BANKEX", label: "BSE Bankex", name: "BSE Bankex", upstoxKey: "BSE_INDEX|BSE Bankex" },
  { yahoo: "^BSE500", label: "BSE 500", name: "BSE 500" },
] as const;

export const INDIA_BENCHMARK_YAHOO_SYMBOLS: string[] = INDIA_BENCHMARK_DEFS.map((d) => d.yahoo);

export function indiaBenchmarkDef(yahoo: string): IndiaBenchmarkDef | undefined {
  return INDIA_BENCHMARK_DEFS.find((d) => d.yahoo === yahoo);
}

export function indiaBenchmarkUpstoxMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of INDIA_BENCHMARK_DEFS) {
    if (d.upstoxKey) out[d.yahoo] = d.upstoxKey;
  }
  return out;
}

export function indiaBenchmarkTrueDataMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of INDIA_BENCHMARK_DEFS) {
    if (d.trueData) out[d.yahoo] = d.trueData;
  }
  return out;
}
