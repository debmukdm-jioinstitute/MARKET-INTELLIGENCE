import { describe, it, expect } from "vitest";
import { friction, STARTING_CAPITAL } from "@/lib/competition/config";
import {
  activityEligible,
  getHoldings,
  portfolioValue,
  rankBoard,
  riskMetrics,
  validateOrder,
} from "@/lib/competition/engine";
import { runSandbox } from "@/lib/competition/backtest";
import type { BoardRow, CorporateAction, Trade } from "@/lib/competition/types";

// Fixtures are entirely offline and never enter the live database or quote pipeline.
const symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ITC"];
const days = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];
function trades(prefix: string, count = 5): Trade[] {
  return symbols
    .slice(0, count)
    .map((symbol, i) => ({
      id: `${prefix}-${i}`,
      symbol,
      side: "BUY",
      shares: 100,
      price: 100,
      grossValue: 10_000,
      brokerage: friction(10_000),
      tradedAt: `${days[i]}T04:00:00Z`,
    }));
}
function seed() {
  const fixtures = [
    {
      name: "Champion",
      count: 5,
      mark: 120,
      values: [1_001_940, 1_003_940, 1_005_940, 1_007_940, 1_009_940],
    },
    {
      name: "Steady",
      count: 5,
      mark: 110,
      values: [1_000_940, 1_001_940, 1_002_940, 1_003_940, 1_004_940],
    },
    {
      name: "Volatile",
      count: 5,
      mark: 110,
      values: [1_030_000, 970_000, 1_040_000, 960_000, 1_004_940],
    },
    {
      name: "Too few symbols",
      count: 1,
      mark: 105,
      values: [1_000_088, 1_000_188, 1_000_288, 1_000_388, 1_000_488],
    },
  ];
  const rows: Omit<BoardRow, "rank">[] = fixtures.map((f) => {
    const ledger = trades(f.name, f.count);
    const holdings = getHoldings(ledger, []);
    const value = portfolioValue(
      holdings,
      Object.fromEntries(symbols.map((s) => [s, f.mark])),
    )!;
    const metrics = riskMetrics(
      f.values.map((value, i) => ({ day: days[i], value })),
    );
    return {
      displayName: f.name,
      value,
      returnPct: (value / STARTING_CAPITAL - 1) * 100,
      symbolsTraded: holdings.symbolsTraded.length,
      eligible: activityEligible(holdings),
      disqualified: false,
      ...metrics,
      lastTradeAt: holdings.lastTradeAt,
      snapshots: 5,
    };
  });
  return rankBoard(rows);
}
describe("offline fake five-day season — hand-verified ledger and standings", () => {
  it("creates four participants, trades across the week and prints the proven board", () => {
    const board = seed();
    console.table(
      board.map((r) => ({
        rank: r.rank,
        name: r.displayName,
        value: r.value,
        returnPct: r.returnPct,
        sharpe: r.sharpe,
        drawdown: r.maxDrawdown,
        eligible: r.eligible,
      })),
    );
    expect(board.map((r) => r.displayName)).toEqual([
      "Champion",
      "Steady",
      "Volatile",
      "Too few symbols",
    ]);
    // 1,000,000 − 50,000 − 60 + 500×120 = 1,009,940.
    expect(board[0].value).toBe(1_009_940);
    expect(board[0].returnPct).toBeCloseTo(0.994, 8);
    expect(board[1].value).toBe(1_004_940);
    expect(board[1].returnPct).toBeCloseTo(0.494, 8);
    expect(board[1].returnPct).toBe(board[2].returnPct);
    expect(board[1].sharpe!).toBeGreaterThan(board[2].sharpe!);
    // 1,000,000 − 10,000 − 12 + 100×105 = 1,000,488.
    expect(board[3].value).toBe(1_000_488);
    expect(board[3].eligible).toBe(false);
  });
  it("rejects concentration, cash shortage, shorting and fractional shares", () => {
    const empty = getHoldings([], []),
      prices = { RELIANCE: 100 };
    expect(validateOrder(empty, prices, "RELIANCE", "BUY", 2500)).toMatch(
      /25%/,
    );
    expect(validateOrder(empty, prices, "RELIANCE", "BUY", 2499)).toBeNull();
    expect(validateOrder(empty, prices, "RELIANCE", "BUY", 10001)).toMatch(
      /cash/,
    );
    expect(validateOrder(empty, prices, "RELIANCE", "SELL", 1)).toMatch(
      /shares/,
    );
    expect(validateOrder(empty, prices, "RELIANCE", "BUY", 0.5)).toMatch(
      /whole/,
    );
  });
  it("applies split/bonus and dividend before ex-date trades, without adjusting later buys twice", () => {
    const buy = trades("split", 1)[0];
    const sell: Trade = {
      ...buy,
      id: "sell",
      side: "SELL",
      shares: 150,
      price: 50,
      grossValue: 7500,
      brokerage: 9,
      tradedAt: "2026-10-06T04:00:00Z",
    };
    const action: CorporateAction = {
      id: "action",
      symbol: "RELIANCE",
      ratio: 2,
      dividend: 2,
      exDate: "2026-10-06",
    };
    const before = getHoldings(
      [buy, sell],
      [action],
      STARTING_CAPITAL,
      Date.parse("2026-10-05T10:00:00Z"),
    );
    expect(before.positions.RELIANCE).toBe(100);
    expect(before.cash).toBe(989_988);
    const after = getHoldings([buy, sell], [action]);
    expect(after.positions.RELIANCE).toBe(50);
    expect(after.cash).toBe(997_679);
    expect(portfolioValue(after, { RELIANCE: 50 })).toBe(1_000_179);
    const later = {
      ...buy,
      id: "later",
      price: 50,
      grossValue: 5000,
      brokerage: 6,
      tradedAt: "2026-10-07T04:00:00Z",
    };
    expect(getHoldings([buy, sell, later], [action]).positions.RELIANCE).toBe(
      150,
    );
  });
  it("never substitutes missing marks and retains risk-tiebreak priority", () => {
    expect(portfolioValue(getHoldings(trades("missing"), []), {})).toBeNull();
    const row = seed()[1];
    const tied = [
      {
        ...row,
        displayName: "Later",
        sharpe: 1,
        maxDrawdown: 2,
        lastTradeAt: "2026-10-09T07:00:00Z",
      },
      {
        ...row,
        displayName: "Earlier",
        sharpe: 1,
        maxDrawdown: 2,
        lastTradeAt: "2026-10-09T06:00:00Z",
      },
      {
        ...row,
        displayName: "Less drawdown",
        sharpe: 1,
        maxDrawdown: 1,
        lastTradeAt: "2026-10-09T08:00:00Z",
      },
    ];
    expect(rankBoard(tied).map((r) => r.displayName)).toEqual([
      "Less drawdown",
      "Earlier",
      "Later",
    ]);
    expect(rankBoard([{ ...row, disqualified: true }])[0].rank).toBeNull();
    expect(
      riskMetrics([
        { day: days[0], value: 1_000_000 },
        { day: days[1], value: 1_000_000 },
      ]).sharpe,
    ).toBeNull();
  });
  it("matches a hand-computed next-open backtest including both fees", () => {
    const bars = [100, 100, 100, 120, 110].map((c, i) => ({
      t: Date.parse(days[i]) / 1000,
      o: 100,
      h: c,
      l: 100,
      c,
      v: 10000,
    }));
    const result = runSandbox("SAMPLE", bars, {
      condition: "momentum",
      fast: 2,
      slow: 3,
      rsiThreshold: 30,
      rsiPeriod: 2,
      stopLoss: 5,
      takeProfit: 10,
    });
    // 9,988 shares × 100 + 1,198.56 entry fee; exit 110 less 1,318.42 fee.
    expect(result.trades).toBe(1);
    expect(result.equity.at(-1)!.value).toBeCloseTo(1_097_363.02, 2);
    expect(result.totalReturnPct).toBeCloseTo(9.736302, 6);
    expect(result.winRate).toBe(100);
  });
});
