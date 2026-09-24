import type {
  MacroRegimeBlock,
  MacroRegimeQuadrant,
  RegimeHistoryPoint,
  RegimeSignal,
  RegimeTone,
} from "@/lib/macro/types";

function toneFromDelta(delta: number | null, invert = false): RegimeTone {
  if (delta == null || !Number.isFinite(delta)) return "neutral";
  const d = invert ? -delta : delta;
  if (d > 0.15) return "positive";
  if (d < -0.15) return "negative";
  return "neutral";
}

function emoji(tone: RegimeTone) {
  if (tone === "positive") return "🟢";
  if (tone === "negative") return "🔴";
  return "🟡";
}

function classifyQuadrant(growth: number, inflation: number): MacroRegimeQuadrant {
  const gUp = growth >= 0;
  const iUp = inflation >= 0;
  if (gUp && !iUp) return "goldilocks";
  if (gUp && iUp) return "reflation";
  if (!gUp && iUp) return "stagflation";
  return "deflation";
}

function quadrantLabel(q: MacroRegimeQuadrant) {
  const map: Record<MacroRegimeQuadrant, string> = {
    goldilocks: "Goldilocks",
    reflation: "Reflation",
    stagflation: "Stagflation",
    deflation: "Deflation",
  };
  return map[q];
}

export function buildRegimeBlock(input: {
  gdpGrowth: number | null;
  gdpGrowthPrev: number | null;
  cpiYoy: number | null;
  cpiYoyPrev: number | null;
  creditGrowth: number | null;
  gsec10y: number | null;
  gsec10yPrev: number | null;
  fiscalDeficitPct: number | null;
  usdInrChgPct: number | null;
  gdpHistory: { date: string; value: number }[];
  cpiHistory: { date: string; value: number }[];
}): MacroRegimeBlock {
  const gDelta =
    input.gdpGrowth != null && input.gdpGrowthPrev != null
      ? input.gdpGrowth - input.gdpGrowthPrev
      : null;
  const iDelta =
    input.cpiYoy != null && input.cpiYoyPrev != null ? input.cpiYoy - input.cpiYoyPrev : null;
  const rateDelta =
    input.gsec10y != null && input.gsec10yPrev != null ? input.gsec10y - input.gsec10yPrev : null;

  const growthTone = toneFromDelta(gDelta);
  const inflTone = toneFromDelta(iDelta, true);
  const liqTone: RegimeTone =
    input.creditGrowth != null
      ? input.creditGrowth > 12
        ? "positive"
        : input.creditGrowth < 8
          ? "negative"
          : "neutral"
      : "neutral";
  const ratesTone: RegimeTone =
    rateDelta != null
      ? rateDelta > 0.05
        ? "negative"
        : rateDelta < -0.05
          ? "positive"
          : "neutral"
      : "neutral";
  const fiscalTone: RegimeTone =
    input.fiscalDeficitPct != null
      ? input.fiscalDeficitPct < 5.5
        ? "positive"
        : input.fiscalDeficitPct > 6.5
          ? "negative"
          : "neutral"
      : "neutral";
  const extTone: RegimeTone =
    input.usdInrChgPct != null
      ? input.usdInrChgPct > 0.01
        ? "negative"
        : input.usdInrChgPct < -0.01
          ? "positive"
          : "neutral"
      : "neutral";

  const signals: RegimeSignal[] = [
    {
      dimension: "growth",
      label: "Growth",
      status: growthTone === "positive" ? "Expanding" : growthTone === "negative" ? "Slowing" : "Stable",
      tone: growthTone,
      emoji: emoji(growthTone),
      detail: input.gdpGrowth != null ? `Real GDP ~${input.gdpGrowth.toFixed(1)}% y/y` : "GDP from World Bank / MOSPI",
    },
    {
      dimension: "inflation",
      label: "Inflation",
      status: inflTone === "negative" ? "Rising" : inflTone === "positive" ? "Cooling" : "Stable",
      tone: inflTone === "positive" ? "positive" : inflTone === "negative" ? "negative" : "neutral",
      emoji: inflTone === "negative" ? "🟠" : emoji(inflTone),
      detail: input.cpiYoy != null ? `Headline CPI ~${input.cpiYoy.toFixed(2)}% y/y` : "CPI from MOSPI / WB",
    },
    {
      dimension: "liquidity",
      label: "Liquidity",
      status: liqTone === "positive" ? "Easy" : liqTone === "negative" ? "Tight" : "Neutral",
      tone: liqTone,
      emoji: emoji(liqTone),
      detail:
        input.creditGrowth != null
          ? `Bank credit growth ~${input.creditGrowth.toFixed(1)}% y/y`
          : "Credit/GDP from World Bank",
    },
    {
      dimension: "rates",
      label: "Rates",
      status: ratesTone === "negative" ? "Hawkish" : ratesTone === "positive" ? "Easing" : "Neutral",
      tone: ratesTone === "negative" ? "negative" : ratesTone === "positive" ? "positive" : "neutral",
      emoji: emoji(ratesTone === "negative" ? "negative" : ratesTone === "positive" ? "positive" : "neutral"),
      detail: input.gsec10y != null ? `10Y G-Sec ~${input.gsec10y.toFixed(2)}%` : "G-Sec from FRED / NSE",
    },
    {
      dimension: "fiscal",
      label: "Fiscal",
      status: fiscalTone === "positive" ? "Supportive" : fiscalTone === "negative" ? "Constrained" : "Neutral",
      tone: fiscalTone,
      emoji: emoji(fiscalTone),
      detail:
        input.fiscalDeficitPct != null
          ? `Central govt deficit ~${input.fiscalDeficitPct.toFixed(1)}% GDP (WB)`
          : "Fiscal from World Bank",
    },
    {
      dimension: "external",
      label: "External",
      status: extTone === "negative" ? "Stressed" : extTone === "positive" ? "Supportive" : "Neutral",
      tone: extTone,
      emoji: emoji(extTone),
      detail: "USD/INR & reserves — see External section",
    },
  ];

  const growthInflationChart: { date: string; growth: number; inflation: number }[] = [];
  const byDateCpi = new Map(input.cpiHistory.map((p) => [p.date.slice(0, 7), p.value]));
  for (const g of input.gdpHistory) {
    const key = g.date.slice(0, 7);
    const infl = byDateCpi.get(key) ?? byDateCpi.get(g.date.slice(0, 4));
    if (infl == null) continue;
    growthInflationChart.push({ date: g.date.slice(0, 7), growth: g.value, inflation: infl });
  }

  const history: RegimeHistoryPoint[] = growthInflationChart.slice(-24).map((p) => {
    const quadrant = classifyQuadrant(p.growth - 5, p.inflation - 4);
    return {
      date: p.date,
      quadrant,
      growthScore: p.growth,
      inflationScore: p.inflation,
      label: quadrantLabel(quadrant),
    };
  });

  const latest = history[history.length - 1];
  const overall = latest?.quadrant ?? classifyQuadrant(
    (input.gdpGrowth ?? 5) - 5,
    (input.cpiYoy ?? 4) - 4,
  );

  return {
    title: "INDIA MACRO REGIME",
    overall,
    overallLabel: quadrantLabel(overall),
    signals,
    history,
    growthInflationChart: growthInflationChart.slice(-36),
  };
}
