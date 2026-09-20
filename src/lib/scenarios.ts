import { getPriceSeries } from "@/lib/market";
import { TRADING_DAYS } from "@/lib/calendar";
import type { VirtualPortfolio } from "@/lib/types";

export type ScenarioId = "soft-landing" | "recession" | "inflation-shock" | "ai-boom" | "usd-surge";

export const SCENARIOS: {
  id: ScenarioId;
  name: string;
  thesis: string;
  horizon: string;
  shocks: Record<string, number>;
}[] = [
  {
    id: "soft-landing",
    name: "Soft Landing",
    thesis: "Growth cools without a profit recession. Duration rallies modestly; credit spreads stable.",
    horizon: "12 months",
    shocks: {
      SPY: 0.11,
      QQQ: 0.14,
      TLT: 0.06,
      HYG: 0.05,
      GLD: 0.04,
      USO: -0.06,
      UUP: -0.03,
      EEM: 0.12,
    },
  },
  {
    id: "recession",
    name: "Hard Landing / Recession",
    thesis: "Labor breaks, earnings compress. Flight-to-quality into long bonds and gold; high yield underperforms.",
    horizon: "12 months",
    shocks: {
      SPY: -0.18,
      QQQ: -0.22,
      IWM: -0.28,
      TLT: 0.14,
      HYG: -0.12,
      LQD: 0.02,
      GLD: 0.11,
      USO: -0.2,
      JPM: -0.16,
    },
  },
  {
    id: "inflation-shock",
    name: "Inflation Relapse",
    thesis: "Sticky services inflation forces a higher-for-longer path. Duration is the casualty; commodities bid.",
    horizon: "9 months",
    shocks: {
      TLT: -0.16,
      IEF: -0.08,
      SPY: -0.07,
      GLD: 0.13,
      USO: 0.22,
      DBC: 0.16,
      XOM: 0.18,
      UUP: 0.06,
      NEE: -0.11,
    },
  },
  {
    id: "ai-boom",
    name: "AI Capex Super-Cycle",
    thesis: "Accelerators, foundries, and power remain supply-constrained. Growth equity leads; cyclicals lag.",
    horizon: "18 months",
    shocks: {
      NVDA: 0.42,
      AVGO: 0.28,
      TSM: 0.24,
      ASML: 0.22,
      MSFT: 0.18,
      QQQ: 0.2,
      NEE: 0.14,
      XOM: -0.04,
      TLT: -0.05,
    },
  },
  {
    id: "usd-surge",
    name: "USD Surge / EM Stress",
    thesis: "Real-rate differential widens. Dollar strength hits EM, commodities, and unhedged international.",
    horizon: "6 months",
    shocks: {
      UUP: 0.09,
      EEM: -0.14,
      EFA: -0.08,
      VXUS: -0.09,
      GLD: -0.07,
      USO: -0.1,
      SPY: -0.03,
      TLT: 0.04,
    },
  },
];

export function applyScenario(portfolio: VirtualPortfolio, id: ScenarioId) {
  const scenario = SCENARIOS.find((item) => item.id === id)!
  const last = TRADING_DAYS[TRADING_DAYS.length - 1]!;
  let nav = portfolio.cash;
  const rows = portfolio.holdings.map((holding) => {
    const px = getPriceSeries(holding.symbol).at(-1)!;
    const shock =
      scenario.shocks[holding.symbol] ??
      scenario.shocks[sectorProxy(holding.symbol)] ??
      0.02;
    const stressed = px * (1 + shock);
    const mv = holding.shares * stressed;
    nav += mv;
    return {
      symbol: holding.symbol,
      shock,
      base: holding.shares * px,
      stressed: mv,
      pnl: mv - holding.shares * px,
    };
  });
  const baseNav = portfolio.holdings.reduce((s, h) => s + h.shares * (getPriceSeries(h.symbol).at(-1) ?? 0), 0) + portfolio.cash;
  void last;
  return { scenario, rows, baseNav, stressedNav: nav, pnl: nav - baseNav, pct: baseNav > 0 ? nav / baseNav - 1 : 0 };
}

function sectorProxy(symbol: string) {
  if (["MSFT", "AAPL", "GOOGL", "AMZN", "META"].includes(symbol)) return "QQQ";
  if (["JPM", "GS", "BRK.B"].includes(symbol)) return "SPY";
  return "SPY";
}
