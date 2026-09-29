import type {
  PortfolioPromoterRiskAssessment,
  FlaggedHoldingRisk,
  PromoterActivityRecord,
} from "./types";
import { PROMOTER_ACTIVITIES_STORE, getPromoterActivitiesBySymbol } from "./database";

export interface PortfolioPositionInput {
  symbol: string;
  companyName?: string;
  shares?: number;
  marketValueInr?: number;
  weight?: number; // 0.0 to 1.0 or 0 to 100
}

/**
 * Feeds promoter, insider, pledge, and deal intelligence directly into the portfolio risk engine.
 */
export function assessPortfolioPromoterRisk(
  positions: PortfolioPositionInput[] = []
): PortfolioPromoterRiskAssessment {
  if (!positions || positions.length === 0) {
    return {
      totalHeldPositionsScanned: 0,
      positionsWithFlagsCount: 0,
      overallGovernanceRiskScore: 10,
      governanceRiskGrade: "LOW",
      pledgeRiskExposureCr: 0,
      promoterSellingExposureCr: 0,
      promoterBuyingSupportCr: 0,
      criticalAlertsCount: 0,
      warningAlertsCount: 0,
      positiveSignalsCount: 0,
      flaggedHoldings: [],
      recommendationSummary: "No active holdings provided. Portfolio governance risk is benign.",
    };
  }

  // Normalize weights
  const totalValue = positions.reduce((acc, p) => acc + (p.marketValueInr || 0), 0);
  const normalizedPositions = positions.map((p) => {
    let weightPct = 0;
    if (p.weight != null && p.weight > 0) {
      weightPct = p.weight > 1 ? p.weight : p.weight * 100;
    } else if (totalValue > 0 && p.marketValueInr) {
      weightPct = (p.marketValueInr / totalValue) * 100;
    } else {
      weightPct = 100 / positions.length;
    }
    return {
      symbol: p.symbol.toUpperCase().trim(),
      companyName: p.companyName || p.symbol,
      marketValueInr: p.marketValueInr || 0,
      weightPct: Number(weightPct.toFixed(2)),
    };
  });

  const flaggedHoldings: FlaggedHoldingRisk[] = [];
  let baseRiskScore = 15; // baseline market governance risk
  let pledgeExposureCr = 0;
  let sellingExposureCr = 0;
  let buyingSupportCr = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let positiveCount = 0;

  for (const pos of normalizedPositions) {
    const activities = getPromoterActivitiesBySymbol(pos.symbol);
    if (activities.length === 0) continue;

    const hasPledgeIncrease = activities.some((a) => a.category === "PLEDGE_INCREASE");
    const hasPledgeDecrease = activities.some((a) => a.category === "PLEDGE_DECREASE");
    const hasPromoterSelling = activities.some((a) => a.category === "PROMOTER_SELLING");
    const hasPromoterBuying = activities.some((a) => a.category === "PROMOTER_BUYING");
    const hasInsiderSelling = activities.some((a) => a.category === "INSIDER_SELLING");
    const hasBlockSale = activities.some(
      (a) => a.category === "BLOCK_DEAL" && a.stakePctChange < 0
    );

    let highestCategory = activities[0].category;
    let severity: FlaggedHoldingRisk["riskSeverity"] = "NEUTRAL";
    let note = "";
    let pledgeData: FlaggedHoldingRisk["pledgeStatus"] | undefined = undefined;

    // Check pledge
    const pledgeAct = activities.find((a) => a.pledgePctOfPromoterHolding != null);
    if (pledgeAct) {
      pledgeData = {
        pledgePctOfPromoterHolding: pledgeAct.pledgePctOfPromoterHolding || 0,
        pledgePctOfTotalEquity: pledgeAct.pledgePctOfTotalEquity || 0,
        trend: hasPledgeIncrease ? "INCREASED" : hasPledgeDecrease ? "DECREASED" : "UNCHANGED",
      };
    }

    if (hasPledgeIncrease || (pledgeData && pledgeData.pledgePctOfPromoterHolding > 30)) {
      highestCategory = "PLEDGE_INCREASE";
      severity = "CRITICAL";
      criticalCount += 1;
      const pledgeVal = (pos.marketValueInr / 1e7);
      pledgeExposureCr += pledgeVal > 0 ? pledgeVal : 10;
      baseRiskScore += (pos.weightPct * 0.45);
      note = `High Governance / Margin Call Hazard: Promoter pledge is elevated at ${pledgeData?.pledgePctOfPromoterHolding || 45}%. Shares are vulnerable to lender liquidation if stock corrects.`;
    } else if (hasPromoterSelling || hasBlockSale) {
      highestCategory = "PROMOTER_SELLING";
      severity = "WARNING";
      warningCount += 1;
      const sellVal = (pos.marketValueInr / 1e7);
      sellingExposureCr += sellVal > 0 ? sellVal : 5;
      baseRiskScore += (pos.weightPct * 0.25);
      note = `Promoter / Sponsor Stake Monetization: Active secondary sales creating supply overhang. Monitor if capital is redeployed or extracted.`;
    } else if (hasInsiderSelling) {
      highestCategory = "INSIDER_SELLING";
      severity = "WARNING";
      warningCount += 1;
      baseRiskScore += (pos.weightPct * 0.12);
      note = `Insider Liquidation: Designated directors or executives sold shares post-vesting. Keep position sizing disciplined.`;
    } else if (hasPromoterBuying || hasPledgeDecrease) {
      highestCategory = hasPledgeDecrease ? "PLEDGE_DECREASE" : "PROMOTER_BUYING";
      severity = "POSITIVE";
      positiveCount += 1;
      const buyVal = (pos.marketValueInr / 1e7);
      buyingSupportCr += buyVal > 0 ? buyVal : 5;
      baseRiskScore -= (pos.weightPct * 0.2);
      note = hasPledgeDecrease
        ? "Positive Deleveraging: Promoter released encumbered shares following debt prepayment, strengthening financial stability."
        : "Bullish Promoter Conviction: Direct open market equity accumulation signals insider alignment and undervaluation.";
    }

    flaggedHoldings.push({
      symbol: pos.symbol,
      companyName: pos.companyName,
      portfolioWeightPct: pos.weightPct,
      portfolioValueInr: pos.marketValueInr,
      highestRiskCategory: highestCategory,
      riskSeverity: severity,
      activeActivities: activities,
      advisoryNote: note,
      pledgeStatus: pledgeData,
    });
  }

  // Ensure critical hazard elevates score appropriately
  if (criticalCount > 0) {
    baseRiskScore = Math.max(68, baseRiskScore + criticalCount * 25);
  } else if (warningCount > 0) {
    baseRiskScore = Math.max(42, baseRiskScore + warningCount * 12);
  }

  // Clamp score
  const finalScore = Math.max(5, Math.min(95, Math.round(baseRiskScore)));

  let grade: PortfolioPromoterRiskAssessment["governanceRiskGrade"] = "LOW";
  let rec = "";

  if (criticalCount > 0 || finalScore >= 65) {
    grade = "HIGH_PLEDGE_RISK";
    rec = `High Governance Hazard: Portfolio has exposure to ${criticalCount} company with heavy promoter pledge or active encumbrance increases. Review position weights to prevent liquidation drawdowns.`;
  } else if (finalScore >= 40) {
    grade = "ELEVATED";
    rec = "Elevated Insider Selling Pressure: Several positions are experiencing promoter or senior executive profit-taking. Maintain tight risk stops.";
  } else if (finalScore >= 25) {
    grade = "MODERATE";
    rec = "Moderate Governance Risk: Portfolio has balanced exposure with isolated promoter moves. Monitor periodic quarterly shareholding pattern updates.";
  } else {
    grade = "LOW";
    rec = "Clean Governance Profile: Minimal promoter pledge exposure and positive promoter alignment support overall portfolio stability.";
  }

  return {
    totalHeldPositionsScanned: positions.length,
    positionsWithFlagsCount: flaggedHoldings.length,
    overallGovernanceRiskScore: finalScore,
    governanceRiskGrade: grade,
    pledgeRiskExposureCr: Number(pledgeExposureCr.toFixed(2)),
    promoterSellingExposureCr: Number(sellingExposureCr.toFixed(2)),
    promoterBuyingSupportCr: Number(buyingSupportCr.toFixed(2)),
    criticalAlertsCount: criticalCount,
    warningAlertsCount: warningCount,
    positiveSignalsCount: positiveCount,
    flaggedHoldings: flaggedHoldings.sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, POSITIVE: 2, NEUTRAL: 3 };
      return order[a.riskSeverity] - order[b.riskSeverity];
    }),
    recommendationSummary: rec,
  };
}
