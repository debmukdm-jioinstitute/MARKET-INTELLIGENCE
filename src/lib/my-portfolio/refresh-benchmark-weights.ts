import {
  fetchNseIndexConstituentSymbols,
  nseIndexConstituentSourceUrl,
} from "@/lib/feeds/india/nse-index-constituents";
import { fetchYahooQuoteDetail } from "@/lib/feeds/sources/yahoo";
import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { SENSEX_CONSTITUENT_SYMBOLS } from "@/lib/my-portfolio/benchmark-constituents";
import {
  saveBenchmarkWeights,
  type BenchmarkWeightMethod,
  type BenchmarkWeightsRow,
} from "@/lib/my-portfolio/benchmark-weights-store";

/** NSE archives CSV per India benchmark (Sensex uses BSE-listed symbol list). */
export const NSE_BENCHMARK_CSV: Partial<Record<BenchmarkId, string>> = {
  NIFTY50: "ind_nifty50list.csv",
  BANKNIFTY: "ind_niftybanklist.csv",
  FINNIFTY: "ind_niftyfinancialservices25-50list.csv",
  MIDCPNIFTY: "ind_niftymidcap150list.csv",
  NIFTYNXT50: "ind_niftynext50list.csv",
  NIFTY_IT: "ind_niftyitlist.csv",
  NIFTY_METAL: "ind_niftymetallist.csv",
  NIFTY_ENERGY: "ind_niftyenergylist.csv",
};

const INDIA_REFRESH_BENCHMARKS = Object.keys(NSE_BENCHMARK_CSV) as BenchmarkId[];

function normalizeWeights(raw: Record<string, number>): Record<string, number> {
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return raw;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / sum]));
}

async function yahooMarketCap(symbol: string, preferBse: boolean): Promise<number | null> {
  const candidates = preferBse ? [`${symbol}.BO`, `${symbol}.NS`, symbol] : [`${symbol}.NS`, `${symbol}.BO`, symbol];
  for (const cand of candidates) {
    const meta = await fetchYahooQuoteDetail(cand).catch(() => null);
    const cap = meta?.marketCap;
    if (cap != null && cap > 0 && Number.isFinite(cap)) return cap;
  }
  return null;
}

async function buildMarketCapMap(symbols: string[], preferBse: boolean): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const batchSize = 8;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const chunk = symbols.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (sym) => {
        const cap = await yahooMarketCap(sym, preferBse);
        if (cap != null) map.set(sym.toUpperCase(), cap);
      }),
    );
  }
  return map;
}

function weightsFromSymbols(
  symbols: string[],
  capMap: Map<string, number>,
): { weights: Record<string, number>; method: BenchmarkWeightMethod } | null {
  let capSum = 0;
  const caps: Record<string, number> = {};
  for (const sym of symbols) {
    const c = capMap.get(sym.toUpperCase());
    if (c != null && c > 0) {
      caps[sym.toUpperCase()] = c;
      capSum += c;
    }
  }
  // No equal-weight guess. Also refuse a basket where too many caps are missing: weights would be skewed.
  if (capSum <= 0 || Object.keys(caps).length < symbols.length * 0.9) return null;
  const weights = Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, v / capSum]));
  return { weights, method: "cap_yahoo" };
}

export async function refreshBenchmarkWeights(benchmark: BenchmarkId): Promise<BenchmarkWeightsRow | null> {
  const csv = NSE_BENCHMARK_CSV[benchmark];
  let symbols: string[] | null = null;
  let sourceUrl = "";
  const preferBse = benchmark === "SENSEX";

  if (csv) {
    symbols = await fetchNseIndexConstituentSymbols(csv);
    sourceUrl = nseIndexConstituentSourceUrl(csv);
  } else if (benchmark === "SENSEX") {
    symbols = [...SENSEX_CONSTITUENT_SYMBOLS];
    sourceUrl = "https://www.bseindia.com/indices/IndexArchive/16";
  } else {
    return null;
  }

  const capMap = await buildMarketCapMap(symbols, preferBse);
  const computed = weightsFromSymbols(symbols, capMap);
  if (!computed) return null;
  const { weights, method } = computed;
  const row: BenchmarkWeightsRow = {
    benchmark,
    weights: normalizeWeights(weights),
    asOf: new Date().toISOString().slice(0, 10),
    sourceUrl,
    method,
    fetchedAt: new Date().toISOString(),
  };
  await saveBenchmarkWeights(row);
  return row;
}

export type RefreshBenchmarkWeightsResult = {
  benchmark: BenchmarkId;
  ok: boolean;
  symbols?: number;
  method?: BenchmarkWeightMethod;
  error?: string;
};

/** Refresh all NSE-listed index baskets (shared Yahoo cap fetch). */
export async function refreshAllIndiaBenchmarkWeights(): Promise<RefreshBenchmarkWeightsResult[]> {
  const symbolLists = new Map<BenchmarkId, string[]>();
  const results: RefreshBenchmarkWeightsResult[] = [];

  for (const benchmark of [...INDIA_REFRESH_BENCHMARKS, "SENSEX" as BenchmarkId]) {
    try {
      if (benchmark === "SENSEX") {
        symbolLists.set(benchmark, [...SENSEX_CONSTITUENT_SYMBOLS]);
      } else {
        const csv = NSE_BENCHMARK_CSV[benchmark]!;
        symbolLists.set(benchmark, await fetchNseIndexConstituentSymbols(csv));
      }
    } catch (e) {
      results.push({
        benchmark,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const uniqueSymbols = [...new Set([...symbolLists.values()].flat())];
  const capMap = await buildMarketCapMap(uniqueSymbols, false);
  const sensexCap = await buildMarketCapMap(symbolLists.get("SENSEX") ?? [], true);

  for (const [benchmark, symbols] of symbolLists) {
    try {
      const caps = benchmark === "SENSEX" ? sensexCap : capMap;
      const computed = weightsFromSymbols(symbols, caps);
      if (!computed) {
        results.push({ benchmark, ok: false, error: "Too few live market caps to weight this index" });
        continue;
      }
      const { weights, method } = computed;
      const csv = NSE_BENCHMARK_CSV[benchmark];
      const sourceUrl =
        benchmark === "SENSEX"
          ? "https://www.bseindia.com/indices/IndexArchive/16"
          : nseIndexConstituentSourceUrl(csv!);
      const row: BenchmarkWeightsRow = {
        benchmark,
        weights: normalizeWeights(weights),
        asOf: new Date().toISOString().slice(0, 10),
        sourceUrl,
        method,
        fetchedAt: new Date().toISOString(),
      };
      await saveBenchmarkWeights(row);
      results.push({ benchmark, ok: true, symbols: symbols.length, method });
    } catch (e) {
      results.push({
        benchmark,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}
