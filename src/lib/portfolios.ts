import { LAST_DATE } from "@/lib/calendar";
import { getPrice } from "@/lib/market";
import type { Holding, Trade, VirtualPortfolio } from "@/lib/types";

function lot(symbol: string, notional: number, asOf = "2021-03-15"): Holding {
  const px = getPrice(symbol, asOf);
  return { symbol, shares: Number((notional / px).toFixed(4)), avgCost: px };
}

function seedTrades(id: string, holdings: Holding[]): Trade[] {
  return holdings.map((holding, i) => {
    const side: Trade["side"] = i % 5 === 0 ? "SELL" : "BUY";
    const shares = Number(Math.max(1, holding.shares * (i % 5 === 0 ? 0.08 : 0.12)).toFixed(4));
    const price = holding.avgCost * (i % 5 === 0 ? 1.08 : 0.97);
    return {
      id: `${id}-t${i}`,
      date: i % 2 === 0 ? "2022-06-15" : "2023-11-02",
      symbol: holding.symbol,
      side,
      shares,
      price,
      notional: Number((shares * price).toFixed(2)),
    };
  });
}

function book(id: string, name: string, mandate: string, strategy: string, benchmark: string, inception: string, cash: number, holdings: Holding[]): VirtualPortfolio {
  return {
    id,
    name,
    mandate,
    strategy,
    benchmark,
    inception,
    baseCurrency: "USD",
    cash,
    holdings,
    trades: seedTrades(id, holdings),
  };
}

export const SEED_PORTFOLIOS: VirtualPortfolio[] = [
  book(
    "flagship",
    "MI Flagship Global",
    "Global long-only equity with a 70/20/10 equity/credit/real-asset sleeve. Tracking-error budget 6%.",
    "Quality compounders, AI infrastructure, and selective value cyclicals versus SPY.",
    "SPY",
    "2019-06-03",
    1_850_000,
    [
      lot("MSFT", 4_200_000),
      lot("NVDA", 3_600_000, "2022-10-12"),
      lot("AAPL", 3_100_000),
      lot("GOOGL", 2_200_000),
      lot("AMZN", 1_900_000),
      lot("AVGO", 1_600_000, "2023-01-20"),
      lot("TSM", 1_400_000),
      lot("ASML", 1_250_000),
      lot("LLY", 1_350_000, "2021-11-04"),
      lot("JPM", 1_100_000),
      lot("UNH", 980_000),
      lot("BRK.B", 1_050_000),
      lot("EFA", 1_200_000),
      lot("EEM", 720_000),
      lot("LQD", 1_400_000),
      lot("GLD", 780_000),
    ],
  ),
  book(
    "balanced",
    "MI Balanced Income",
    "Multi-asset income: 45% equity / 40% fixed income / 15% real assets. Volatility ceiling 9%.",
    "Carry plus quality: IG credit, TIPS, dividend compounders, gold ballast.",
    "SPY",
    "2019-01-02",
    2_400_000,
    [
      lot("SPY", 2_200_000),
      lot("VXUS", 1_100_000),
      lot("JNJ", 700_000),
      lot("JPM", 650_000),
      lot("NEE", 520_000),
      lot("PLD", 480_000),
      lot("BND", 2_100_000),
      lot("IEF", 1_200_000),
      lot("LQD", 1_350_000),
      lot("HYG", 700_000),
      lot("TIP", 800_000),
      lot("GLD", 620_000),
      lot("VNQ", 540_000),
    ],
  ),
  book(
    "macro",
    "MI Quant Macro Overlay",
    "Tactical overlay: equity beta 0.4–0.8, explicit rates/commodity/FX sleeves, monthly rebalance.",
    "Regime-aware mix of QQQ, duration, crude, dollar, and gold with a high-yield credit barbell.",
    "SPY",
    "2020-04-01",
    3_100_000,
    [
      lot("QQQ", 2_400_000, "2020-04-01"),
      lot("IWM", 800_000, "2020-04-01"),
      lot("TLT", 1_700_000, "2020-04-01"),
      lot("IEF", 900_000, "2020-04-01"),
      lot("HYG", 650_000, "2020-04-01"),
      lot("GLD", 1_100_000, "2020-04-01"),
      lot("USO", 720_000, "2020-04-01"),
      lot("DBC", 540_000, "2020-04-01"),
      lot("UUP", 680_000, "2020-04-01"),
      lot("CAT", 420_000, "2021-06-15"),
      lot("XOM", 510_000, "2021-06-15"),
    ],
  ),
];

export function markPortfolio(portfolio: VirtualPortfolio) {
  void LAST_DATE;
  return portfolio;
}
