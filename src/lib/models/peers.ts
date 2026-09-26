/**
 * Peer set: bottom-up (unlevered) beta and trading multiples.
 *
 * `buildPeerRow` / `summarizePeers` are pure and unit-tested; `fetchPeerSet`
 * is the best-effort Yahoo wrapper (peers come from Yahoo's "similar
 * companies" list, restricted to the target's own exchange so the beta
 * regression benchmark is the same index).
 */
import { alignMonthly, fetchChart, fetchMonthlySeries, getJson } from "@/lib/models/yahoo-fundamentals";
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
  const de = Math.max(0, i.debt) / marketCap;
  const unleveredBeta = leveredBeta / (1 + (1 - i.taxRate) * de);
  const ev = marketCap + i.debt - i.cash;
  const pos = (n: number | null) => (n != null && n > 0 ? n : null);
  return {
    symbol: i.symbol,
    name: i.name,
    marketCap,
    enterpriseValue: ev,
    evEbitda: pos(i.ebitda) ? ev / i.ebitda! : null,
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
  const annual = ["OrdinarySharesNumber", "TotalDebt", "CashCashEquivalentsAndShortTermInvestments", "StockholdersEquity", "TaxProvision", "PretaxIncome", "EBITDA", "TotalRevenue", "NetIncome"];
  const trailing = ["EBITDA", "TotalRevenue", "NetIncome"];
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

async function fetchOnePeer(symbol: string, index: PriceSeries): Promise<PeerRow | null> {
  const [chart, monthly, fin] = await Promise.all([
    fetchChart(symbol, "5d", "1d"),
    fetchMonthlySeries(symbol, symbol),
    fetchPeerFinancials(symbol),
  ]);
  const price = Number(chart.meta?.regularMarketPrice);
  const listingCcy = chart.meta?.currency;
  // Skip peers whose price and statements are in different currencies (ADRs) — multiples would be wrong.
  if (!(price > 0) || !fin.statementCurrency || listingCcy !== fin.statementCurrency) return null;
  const shares = fin.g("annualOrdinarySharesNumber");
  if (!shares) return null;
  const [s, ix] = alignMonthly(monthly, index);
  const reg = linreg(monthlyReturns(s.closes), monthlyReturns(ix.closes));
  if (reg.n < 24 || reg.slope < -1 || reg.slope > 4) return null;
  const pretax = fin.g("annualPretaxIncome");
  const tax = fin.g("annualTaxProvision");
  const taxRate = pretax && pretax > 0 && tax != null ? Math.min(0.35, Math.max(0.1, tax / pretax)) : 0.25;
  return buildPeerRow({
    symbol,
    name: chart.meta?.longName ?? chart.meta?.shortName ?? symbol,
    price,
    shares,
    debt: fin.g("annualTotalDebt") ?? 0,
    cash: fin.g("annualCashCashEquivalentsAndShortTermInvestments") ?? 0,
    ebitda: fin.g("trailingEBITDA") ?? fin.g("annualEBITDA"),
    revenue: fin.g("trailingTotalRevenue") ?? fin.g("annualTotalRevenue"),
    netIncome: fin.g("trailingNetIncome") ?? fin.g("annualNetIncome"),
    equity: fin.g("annualStockholdersEquity"),
    taxRate,
    rawBeta: reg.slope,
  });
}

/** Fetches up to 6 same-exchange "similar companies" and summarises beta + multiples. Returns null when none usable. */
export async function fetchPeerSet(symbol: string, index: PriceSeries, _currency: string): Promise<PeerSet | null> {
  void _currency;
  const rec = await getJson<{ finance?: { result?: { recommendedSymbols?: { symbol: string }[] }[] } }>(
    `/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`,
    {},
    8_000,
  );
  const suffix = symbol.includes(".") ? symbol.split(".").pop()!.toUpperCase() : "";
  const candidates = (rec?.finance?.result?.[0]?.recommendedSymbols ?? [])
    .map((r) => r.symbol)
    .filter((s) => s && s !== symbol && (s.includes(".") ? s.split(".").pop()!.toUpperCase() : "") === suffix)
    .slice(0, 6);
  if (!candidates.length) return null;
  const settled = await Promise.allSettled(candidates.map((c) => fetchOnePeer(c, index)));
  const rows = settled.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  return summarizePeers(rows, "Yahoo Finance similar-company list (same exchange), TTM multiples, Blume-adjusted & unlevered peer betas");
}
