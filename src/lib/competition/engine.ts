import {
  friction,
  MIN_SYMBOLS,
  POSITION_CAP,
  STARTING_CAPITAL,
  marketOpen,
} from "./config";
import type {
  BoardRow,
  CorporateAction,
  Holdings,
  PriceMap,
  Snapshot,
  Trade,
} from "./types";

/** Pure ledger replay. Ex-date adjustments precede all trades in that day's session. */
export function getHoldings(
  trades: Trade[],
  actions: CorporateAction[],
  capital = STARTING_CAPITAL,
  asOf = Infinity,
): Holdings {
  const holdings: Holdings = {
    cash: capital,
    positions: {},
    symbolsTraded: [],
    lastTradeAt: null,
  };
  const seen = new Set<string>();
  const events = [
    ...trades.map((t) => ({
      at: Date.parse(t.tradedAt),
      order: 1,
      id: t.id,
      trade: t,
      action: null,
    })),
    ...actions.map((a) => ({
      at: Date.parse(marketOpen(a.exDate)),
      order: 0,
      id: a.id,
      trade: null,
      action: a,
    })),
  ]
    .filter((e) => e.at <= asOf)
    .sort(
      (a, b) => a.at - b.at || a.order - b.order || a.id.localeCompare(b.id),
    );
  for (const event of events) {
    if (event.action) {
      const a = event.action;
      const shares = holdings.positions[a.symbol] ?? 0;
      // Dividend is per pre-action share; separate rows for simultaneous actions are ordered by ID.
      holdings.cash += shares * a.dividend;
      holdings.positions[a.symbol] = shares * a.ratio;
    } else if (event.trade) {
      const t = event.trade;
      const sign = t.side === "BUY" ? 1 : -1;
      holdings.cash -= sign * t.grossValue + t.brokerage;
      holdings.positions[t.symbol] =
        (holdings.positions[t.symbol] ?? 0) + sign * t.shares;
      seen.add(t.symbol);
      holdings.lastTradeAt = t.tradedAt;
    }
  }
  holdings.cash = Math.round(holdings.cash * 100) / 100;
  holdings.positions = Object.fromEntries(
    Object.entries(holdings.positions).filter(([, shares]) => shares > 1e-8),
  );
  holdings.symbolsTraded = [...seen];
  return holdings;
}

/** Missing marks produce an unavailable value, never a made-up price or partial total. */
export function portfolioValue(
  holdings: Holdings,
  prices: PriceMap,
): number | null {
  let total = holdings.cash;
  for (const [symbol, shares] of Object.entries(holdings.positions)) {
    if (!Number.isFinite(prices[symbol]) || prices[symbol] <= 0) return null;
    total += shares * prices[symbol];
  }
  return total;
}

export function validateOrder(
  holdings: Holdings,
  prices: PriceMap,
  symbol: string,
  side: "BUY" | "SELL",
  shares: number,
): string | null {
  if (!Number.isSafeInteger(shares) || shares <= 0 || shares > 1_000_000)
    return "Enter a positive whole number of shares (up to 10,00,000).";
  const price = prices[symbol];
  if (!Number.isFinite(price) || price <= 0)
    return "Price unavailable — data delayed.";
  const gross = Math.round(price * shares * 100) / 100;
  const cost = friction(gross);
  const current = holdings.positions[symbol] ?? 0;
  if (side === "SELL")
    return current + 1e-8 < shares
      ? "Insufficient shares; short selling is not allowed."
      : null;
  if (holdings.cash + 1e-8 < gross + cost)
    return "Insufficient cash including brokerage and STT estimate.";
  const value = portfolioValue(holdings, prices);
  if (value === null) return "Portfolio cannot be valued — data delayed.";
  if ((current + shares) * price > (value - cost) * POSITION_CAP + 1e-8)
    return "Order exceeds the 25% single-symbol position cap.";
  return null;
}

export function riskMetrics(
  snapshots: Snapshot[],
  capital = STARTING_CAPITAL,
): { sharpe: number | null; maxDrawdown: number | null } {
  if (!snapshots.length) return { sharpe: null, maxDrawdown: null };
  const ordered = [...snapshots].sort((a, b) => a.day.localeCompare(b.day));
  let peak = capital,
    previous = capital,
    maxDrawdown = 0;
  const returns: number[] = [];
  for (const s of ordered) {
    if (!Number.isFinite(s.value) || s.value <= 0)
      return { sharpe: null, maxDrawdown: null };
    returns.push(s.value / previous - 1);
    previous = s.value;
    peak = Math.max(peak, s.value);
    maxDrawdown = Math.max(maxDrawdown, (peak - s.value) / peak);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.length < 2
      ? 0
      : returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  // Zero variance or fewer than two days means undefined Sharpe (sorts after measured Sharpe).
  return {
    sharpe:
      variance > 1e-18 ? (Math.sqrt(252) * mean) / Math.sqrt(variance) : null,
    maxDrawdown: maxDrawdown * 100,
  };
}

export function rankBoard(rows: Omit<BoardRow, "rank">[]): BoardRow[] {
  const metric = (value: number | null, fallback: number) => value ?? fallback;
  const ranked = [...rows].sort((a, b) => {
    const aRankable = !a.disqualified && a.returnPct !== null;
    const bRankable = !b.disqualified && b.returnPct !== null;
    if (aRankable !== bRankable) return aRankable ? -1 : 1;
    return (
      metric(b.returnPct, -Infinity) - metric(a.returnPct, -Infinity) ||
      metric(b.sharpe, -Infinity) - metric(a.sharpe, -Infinity) ||
      metric(a.maxDrawdown, Infinity) - metric(b.maxDrawdown, Infinity) ||
      metric(a.lastTradeAt ? Date.parse(a.lastTradeAt) : null, Infinity) -
        metric(b.lastTradeAt ? Date.parse(b.lastTradeAt) : null, Infinity) ||
      a.displayName.localeCompare(b.displayName)
    );
  });
  let rank = 0;
  return ranked.map((row) => ({
    ...row,
    rank: row.disqualified || row.returnPct === null ? null : ++rank,
  }));
}
export const activityEligible = (holdings: Holdings) =>
  holdings.symbolsTraded.length >= MIN_SYMBOLS;
