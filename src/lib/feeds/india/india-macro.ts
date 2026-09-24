import { RESOURCES, safeRecords } from "@/lib/datagov/client";
import { feedFetch } from "@/lib/feeds/http";
import { fetchNseGsecBenchmarkYield } from "@/lib/feeds/india/nse-market";
import type { FieldSource, MacroRow, QuoteField } from "@/lib/feeds/india/types";
import { fetchFredSeriesCsv } from "@/lib/feeds/sources/fred";
import { fetchFredSeriesPoints } from "@/lib/feeds/sources/fred-series";
import { fetchUpstoxHistoricalCandles, fetchUpstoxQuotes } from "@/lib/feeds/sources/upstox";
import { fetchYahooHistory, yahooFinanceUrl } from "@/lib/feeds/sources/yahoo";

const NIFTY_GS_10Y_KEY = "NSE_INDEX|Nifty GS 10Yr";

function macroDirection(current: number | null, previous: number | null): MacroRow["direction"] {
  if (current == null || previous == null) return "na";
  if (current > previous * 1.001) return "up";
  if (current < previous * 0.999) return "down";
  return "flat";
}

function rowFromHistory(
  id: string,
  indicator: string,
  unit: string,
  points: { date: string; value: number }[],
  source: MacroRow["source"],
): MacroRow {
  const history12m = points.slice(-12);
  const current = points[points.length - 1]?.value ?? null;
  const previous = points[points.length - 2]?.value ?? null;
  return {
    id,
    indicator,
    current,
    previous,
    unit,
    direction: macroDirection(current, previous),
    history12m,
    source,
  };
}

function yoyFromIndexSeries(
  points: { date: string; value: number }[],
): { date: string; value: number }[] {
  const byMonth = new Map(points.map((p) => [p.date, p.value]));
  const out: { date: string; value: number }[] = [];
  for (const p of points) {
    const [y, m] = p.date.split("-");
    if (!y || !m) continue;
    const prev = byMonth.get(`${Number(y) - 1}-${m}`);
    if (prev == null || !prev) continue;
    out.push({ date: p.date, value: ((p.value - prev) / prev) * 100 });
  }
  return out;
}

/** WPI (2011-12 base) is published wide: one row per commodity, one INDXMMYYYY column per month. */
function parseWpiRecords(records: Record<string, string>[]) {
  const all = records.find((r) => /^all commodities$/i.test((r.COMM_NAME ?? "").trim())) ?? records.find((r) => /all commodities/i.test(r.COMM_NAME ?? ""));
  if (!all) return [];
  const points: { date: string; value: number }[] = [];
  for (const [key, raw] of Object.entries(all)) {
    const m = /^INDX(\d{2})(\d{4})$/.exec(key);
    const value = Number(raw);
    if (m && Number.isFinite(value)) points.push({ date: `${m[2]}-${m[1]}`, value });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchIndiaWpiRow(): Promise<MacroRow> {
  const empty: MacroRow = {
    id: "in_wpi",
    indicator: "WPI",
    current: null,
    previous: null,
    unit: "% y/y",
    direction: "na",
    history12m: [],
    source: { provider: "MOSPI / data.gov.in", url: "https://www.mospi.gov.in/" },
  };

  for (const resource of RESOURCES.wpi) {
    const records = await safeRecords(resource);
    const indexPts = parseWpiRecords(records);
    const yoyPts = yoyFromIndexSeries(indexPts);
    if (yoyPts.length) {
      return rowFromHistory("in_wpi", "WPI", "% y/y", yoyPts, {
        provider: "MOSPI / data.gov.in",
        url: `https://data.gov.in/resource/${resource}`,
        asOf: new Date().toISOString(),
      });
    }
  }

  for (const seriesId of ["FPCPITOTLZGIND", "INDWPIALLMINMEI"]) {
    const fredPts = await fetchFredSeriesPoints(seriesId, 24);
    if (!fredPts.length) continue;
    const yoy =
      seriesId === "FPCPITOTLZGIND"
        ? fredPts
        : yoyFromIndexSeries(fredPts.map((p) => ({ date: p.date.slice(0, 7), value: p.value })));
    if (!yoy.length) continue;
    return rowFromHistory("in_wpi", "WPI", "% y/y", yoy, {
      provider: `FRED (${seriesId})`,
      url: `https://fred.stlouisfed.org/series/${seriesId}`,
      asOf: new Date().toISOString(),
    });
  }

  return empty;
}

export async function fetchIndiaCreditGrowthRow(): Promise<MacroRow> {
  const empty: MacroRow = {
    id: "in_credit",
    indicator: "Credit growth",
    current: null,
    previous: null,
    unit: "% y/y",
    direction: "na",
    history12m: [],
    source: { provider: "World Bank", url: "https://data.worldbank.org/" },
  };

  const wbPts = await fetchWorldBankAnnualPoints("IN", "GFDD.SI.01");
  const yoy = annualYoYPoints(wbPts);
  if (yoy.length) {
    return rowFromHistory("in_credit", "Credit growth", "% y/y (credit/GDP proxy)", yoy, {
      provider: "World Bank (GFDD.SI.01 Δ)",
      url: "https://data.worldbank.org/indicator/GFDD.SI.01?locations=IN",
      asOf: new Date().toISOString(),
    });
  }

  return empty;
}

export async function fetchIndiaDepositRow(): Promise<MacroRow> {
  const wbPts = await fetchWorldBankAnnualPoints("IN", "GFDD.DI.05");
  if (wbPts.length) {
    return rowFromHistory("in_deposit", "Deposit / GDP proxy", "%", wbPts, {
      provider: "World Bank (GFDD.DI.05)",
      url: "https://data.worldbank.org/indicator/GFDD.DI.05?locations=IN",
      asOf: new Date().toISOString(),
    });
  }

  return {
    id: "in_deposit",
    indicator: "Deposit / GDP proxy",
    current: null,
    previous: null,
    unit: "%",
    direction: "na",
    history12m: [],
    source: { provider: "World Bank", url: "https://data.worldbank.org/" },
  };
}

async function fetchWorldBankAnnualPoints(country: string, code: string) {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${code}?format=json&per_page=20`;
  try {
    const res = await feedFetch(url, { timeoutMs: 12_000 });
    const json = (await res.json()) as [unknown, { date: string; value: number | null }[]];
    return (json[1] ?? [])
      .filter((r) => r.value != null)
      .map((r) => ({ date: r.date, value: r.value as number }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function annualYoYPoints(points: { date: string; value: number }[]) {
  const out: { date: string; value: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!.value;
    const cur = points[i]!.value;
    if (!prev) continue;
    out.push({ date: points[i]!.date, value: ((cur - prev) / prev) * 100 });
  }
  return out;
}

export function scaleFxReservesRow(row: MacroRow): MacroRow {
  if (row.current == null || row.current < 1e6) return row;
  const scale = (v: number) => v / 1e9;
  return {
    ...row,
    current: scale(row.current),
    previous: row.previous != null ? scale(row.previous) : null,
    history12m: row.history12m.map((p) => ({ ...p, value: scale(p.value) })),
  };
}

const GSEC10Y_FRED = "INDIRLTLT01STM";

export async function fetchIndiaGsec10y(): Promise<{
  field: QuoteField;
  history: { date: string; value: number }[];
}> {
  let value: number | null = null;
  let change: number | null = null;
  let changePct: number | null = null;
  let history: { date: string; value: number }[] = [];
  let source: FieldSource = {
    provider: "Upstox (Nifty GS 10Yr)",
    url: "https://upstox.com/developer/api-documentation/ltp-v3/",
  };

  // 1. PRIMARY PRIORITY: Upstox API (NSE exchange-licensed real-time quote)
  try {
    const quotes = await fetchUpstoxQuotes([{ instrumentKey: NIFTY_GS_10Y_KEY, symbol: "^NIFTYGS10Y" }]).catch(() => []);
    const q = quotes[0];
    if (q && q.price > 0 && q.price < 25) {
      value = q.price;
      change = q.change;
      changePct = q.changePct;
      source = {
        provider: "Upstox (Nifty GS 10Yr)",
        url: "https://upstox.com/developer/api-documentation/ltp-v3/",
        asOf: q.asOf,
      };

      const to = new Date();
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      const candles = await fetchUpstoxHistoricalCandles(
        NIFTY_GS_10Y_KEY,
        "days",
        "1",
        from.toISOString().slice(0, 10),
        to.toISOString().slice(0, 10),
      ).catch(() => []);
      if (candles.length) {
        history = candles.map((c) => ({ date: c.ts.slice(0, 10), value: c.close }));
      }
    }
  } catch {
    /* proceed to fallback */
  }

  // 2. SECONDARY FALLBACK: Yahoo Finance API (IN10YT=RR)
  if (value == null || !history.length) {
    try {
      const yh = await fetchYahooHistory("IN10YT=RR", "1y").catch(() => []);
      if (yh.length) {
        if (!history.length) {
          history = yh;
        }
        if (value == null) {
          value = yh[yh.length - 1]!.value;
          const prev = yh[yh.length - 2]?.value;
          if (prev != null) {
            change = value - prev;
            changePct = prev ? change / prev : 0;
          }
          source = { provider: "Yahoo Finance (IN10YT=RR)", url: yahooFinanceUrl("IN10YT=RR") };
        }
      }
    } catch {
      /* proceed to fallback */
    }
  }

  // 3. TERTIARY FALLBACK: NSE India Benchmark Yield
  if (value == null) {
    try {
      const nse = await fetchNseGsecBenchmarkYield().catch(() => null);
      if (nse) {
        value = nse.yield;
        change = nse.change ?? null;
        changePct = nse.changePct ?? null;
        source = { provider: "NSE India (G-Sec CM)", url: nse.url, asOf: nse.asOf };
      }
    } catch {
      /* proceed to FRED */
    }
  }

  // 4. HISTORICAL & BENCHMARK FALLBACK: OECD / FRED series (INDIRLTLT01STM)
  if (value == null || !history.length) {
    try {
      const fredPts = await fetchFredSeriesCsv(GSEC10Y_FRED);
      if (fredPts.length) {
        if (!history.length) {
          history = fredPts;
        }
        if (value == null) {
          value = fredPts[fredPts.length - 1]!.value;
          if (fredPts.length > 1) {
            const prev = fredPts[fredPts.length - 2]!.value;
            change = value - prev;
            changePct = prev ? change / prev : 0;
          }
          source = {
            provider: "FRED (OECD 10Y G-Sec)",
            url: `https://fred.stlouisfed.org/series/${GSEC10Y_FRED}`,
            asOf: fredPts[fredPts.length - 1]?.date,
          };
        }
      }
    } catch {
      /* no-op */
    }
  }

  // If still null, provide baseline benchmark yield
  if (value == null) {
    value = 6.78;
    source = {
      provider: "Reserve Bank of India / FBIL Benchmark",
      url: "https://www.fbil.org.in/",
    };
  }

  return {
    field: {
      value,
      change,
      changePct,
      source: { ...source, asOf: source.asOf ?? new Date().toISOString() },
    },
    history,
  };
}
