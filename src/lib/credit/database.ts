import type {
  CreditActivityRecord,
  CreditRatingAgency,
  CreditEventAction,
  PortfolioCreditRiskAssessment,
  FlaggedCreditHolding,
} from "./types";

export const CREDIT_ACTIVITIES_STORE: CreditActivityRecord[] = [
  // 1. CRISIL UPGRADES
  {
    id: "cred-cr-01",
    symbol: "TATAMOTORS",
    companyName: "Tata Motors Limited",
    sector: "Automobile & Auto Components",
    agency: "CRISIL",
    action: "RATING_UPGRADE",
    actionDate: "2026-09-18",
    ratingBefore: "CRISIL AA",
    ratingAfter: "CRISIL AAA",
    outlookBefore: "Positive",
    outlookAfter: "Stable",
    instrument: "Non-Convertible Debentures & Long-Term Bank Facilities",
    ratedDebtAmountCr: 18500.0,
    liquidityAssessment: "Superior",
    keyDrivers: [
      "Zero net automotive debt milestone achieved across India and JLR operations",
      "Robust free cash flow generation exceeding £2.2B at Jaguar Land Rover",
      "Market leadership in domestic commercial vehicles and EV passenger cars"
    ],
    agencyRationale: "CRISIL Ratings has upgraded its rating on the long-term debt instruments of Tata Motors to CRISIL AAA/Stable from CRISIL AA/Positive. The upgrade reflects sustained improvement in the business risk profile driven by strong operational performance and deleveraging.",
    equityConnection: {
      currentPriceInr: 980.5,
      priceAtActionInr: 885.0,
      equityReturnSinceActionPct: 10.79,
      equity1DayReturnPct: 3.42,
      equity1MonthReturnPct: 11.2,
      marketCapCr: 360000.0,
      impliedCreditSpreadBps: 62,
      transmission: "DELEVERAGING_EXPANSION",
      equityImpactAnalysis: "AAA upgrade lowered weighted average cost of debt by ~45 bps, enabling multiple expansion from 14.5x to 18.2x forward P/E as institutional mandate exclusions cleared.",
    },
    sourceUrl: "https://www.crisilratings.com/en/home/our-businesses/ratings.html",
  },
  {
    id: "cred-cr-02",
    symbol: "BHARTIARTL",
    companyName: "Bharti Airtel Limited",
    sector: "Telecommunication",
    agency: "CRISIL",
    action: "RATING_UPGRADE",
    actionDate: "2026-09-10",
    ratingBefore: "CRISIL AA+",
    ratingAfter: "CRISIL AAA",
    outlookBefore: "Positive",
    outlookAfter: "Stable",
    instrument: "Long-Term Bank Facilities & Bonds",
    ratedDebtAmountCr: 28000.0,
    liquidityAssessment: "Superior",
    keyDrivers: [
      "Industry-leading ARPU expansion crossing ₹230 per subscriber",
      "Consistently expanding 5G FCF and prepaid tariff hike realization",
      "Robust deleveraging with net debt to EBITDA below 2.0x"
    ],
    agencyRationale: "CRISIL upgraded Bharti Airtel to AAA on expectations of sustained industry-leading operating metrics, healthy operating cash flows, and disciplined capital allocation.",
    equityConnection: {
      currentPriceInr: 1540.0,
      priceAtActionInr: 1420.0,
      equityReturnSinceActionPct: 8.45,
      equity1DayReturnPct: 2.15,
      equity1MonthReturnPct: 9.8,
      marketCapCr: 880000.0,
      impliedCreditSpreadBps: 55,
      transmission: "CONVICTION_RALLY",
      equityImpactAnalysis: "Pinnacle AAA rating solidified Bharti as a blue-chip utility-growth hybrid; domestic debt funds increased portfolio allocation, absorbing secondary float.",
    },
    sourceUrl: "https://www.crisilratings.com/",
  },

  // 2. ICRA DOWNGRADES & OUTLOOK CHANGES
  {
    id: "cred-ic-01",
    symbol: "INDUSINDBK",
    companyName: "IndusInd Bank Limited",
    sector: "Financial Services",
    agency: "ICRA",
    action: "OUTLOOK_CHANGE",
    actionDate: "2026-09-21",
    ratingBefore: "ICRA AA+",
    ratingAfter: "ICRA AA+",
    outlookBefore: "Stable",
    outlookAfter: "Negative",
    instrument: "Tier II Bonds & Infrastructure Bonds",
    ratedDebtAmountCr: 12500.0,
    liquidityAssessment: "Adequate",
    keyDrivers: [
      "Asset quality slippage in microfinance (MFI) and credit card loan portfolios",
      "Elevated cost of funds impacting net interest margin (NIM) by ~22 bps",
      "Moderate provisioning buffer compared to top-tier private peers"
    ],
    agencyRationale: "ICRA has revised the rating outlook on IndusInd Bank to Negative while reaffirming the rating at ICRA AA+. The outlook revision reflects increased slippages in unsecured retail assets and elevated credit costs.",
    equityConnection: {
      currentPriceInr: 1410.0,
      priceAtActionInr: 1520.0,
      equityReturnSinceActionPct: -7.24,
      equity1DayReturnPct: -3.85,
      equity1MonthReturnPct: -8.4,
      marketCapCr: 110000.0,
      impliedCreditSpreadBps: 185,
      transmission: "IMMEDIATE_PRICED_IN",
      equityImpactAnalysis: "Negative credit outlook catalyzed bank valuation discount vs peers; price-to-book derated from 1.75x to 1.52x as institutional consensus trimmed earnings estimates.",
    },
    sourceUrl: "https://www.icra.in/",
  },
  {
    id: "cred-ic-02",
    symbol: "SPARC",
    companyName: "Sun Pharma Advanced Research Company Ltd",
    sector: "Healthcare & Pharmaceuticals",
    agency: "ICRA",
    action: "LIQUIDITY_CONCERN",
    actionDate: "2026-09-14",
    ratingBefore: "ICRA A-",
    ratingAfter: "ICRA BBB+",
    outlookBefore: "Negative",
    outlookAfter: "Negative",
    instrument: "Short-Term & Long-Term Bank Facilities",
    ratedDebtAmountCr: 850.0,
    liquidityAssessment: "Stretched",
    keyDrivers: [
      "Continuing operational cash burn from clinical research and trial pipeline",
      "Delay in out-licensing milestones and upfront milestone monetization",
      "Reliance on promoter financial support or external equity dilution"
    ],
    agencyRationale: "ICRA downgraded SPARC to BBB+/Negative citing stretched liquidity, continued cash burn in ongoing clinical trials without matching commercialization revenues.",
    equityConnection: {
      currentPriceInr: 215.0,
      priceAtActionInr: 258.0,
      equityReturnSinceActionPct: -16.67,
      equity1DayReturnPct: -5.4,
      equity1MonthReturnPct: -18.2,
      marketCapCr: 7200.0,
      impliedCreditSpreadBps: 420,
      transmission: "DISTRESS_DISCOUNT",
      equityImpactAnalysis: "Downgrade into BBB territory triggered credit mandates selling; equity faced dilution discount as company was forced to prepare rights issue.",
    },
    sourceUrl: "https://www.icra.in/",
  },

  // 3. CARE RATINGS - CREDIT WATCH & UPGRADES
  {
    id: "cred-care-01",
    symbol: "VEDL",
    companyName: "Vedanta Limited",
    sector: "Metals & Mining",
    agency: "CARE Ratings",
    action: "CREDIT_WATCH",
    actionDate: "2026-09-23",
    ratingBefore: "CARE AA-",
    ratingAfter: "CARE AA-",
    outlookBefore: "Stable",
    outlookAfter: "Watch Negative",
    instrument: "Long-Term Bank Facilities & NCDs",
    ratedDebtAmountCr: 14200.0,
    liquidityAssessment: "Stretched",
    keyDrivers: [
      "Parent entity Vedanta Resources debt maturities of $1.2B due in FY27",
      "Promoter share pledge elevated at ~74.8% of holding",
      "Proposed demerger of business into six pure-play listed entities under regulatory review"
    ],
    agencyRationale: "CARE Ratings has placed the ratings of Vedanta on Credit Watch with Negative Implications pending clarity on debt refinancing at parent entity and approvals for corporate demerger scheme.",
    equityConnection: {
      currentPriceInr: 450.0,
      priceAtActionInr: 495.0,
      equityReturnSinceActionPct: -9.09,
      equity1DayReturnPct: -4.12,
      equity1MonthReturnPct: -11.5,
      marketCapCr: 168000.0,
      impliedCreditSpreadBps: 345,
      transmission: "EQUITY_LAGGED",
      equityImpactAnalysis: "Equity market initially ignored parent debt noise until CARE negative watch; dividend yield attraction offset partially by refinancing risk premium.",
    },
    sourceUrl: "https://www.careratings.com/",
  },
  {
    id: "cred-care-02",
    symbol: "SUZLON",
    companyName: "Suzlon Energy Limited",
    sector: "Renewable Energy & Power",
    agency: "CARE Ratings",
    action: "RATING_UPGRADE",
    actionDate: "2026-09-17",
    ratingBefore: "CARE BBB+",
    ratingAfter: "CARE A-",
    outlookBefore: "Positive",
    outlookAfter: "Positive",
    instrument: "Fund-Based & Non-Fund Based Bank Facilities",
    ratedDebtAmountCr: 4500.0,
    liquidityAssessment: "Strong",
    keyDrivers: [
      "Attainment of net cash status following QIP equity infusion",
      "Record turbine delivery order book crossing 4.5 GW",
      "Substantial reduction in finance costs from ₹800 Cr to under ₹80 Cr annually"
    ],
    agencyRationale: "CARE Ratings upgraded Suzlon by two notches to A-/Positive reflecting sustained operational turnaround, debt-free balance sheet, and healthy order book visibility.",
    equityConnection: {
      currentPriceInr: 82.5,
      priceAtActionInr: 68.0,
      equityReturnSinceActionPct: 21.32,
      equity1DayReturnPct: 5.0,
      equity1MonthReturnPct: 24.5,
      marketCapCr: 112000.0,
      impliedCreditSpreadBps: 145,
      transmission: "CONVICTION_RALLY",
      equityImpactAnalysis: "Transition from junk-tier to investment-grade A category allowed institutional mutual funds to buy equity for the first time in 12 years.",
    },
    sourceUrl: "https://www.careratings.com/",
  },

  {
    id: "cred-care-03",
    symbol: "UPL",
    companyName: "UPL Limited",
    sector: "Agrochemicals & Chemicals",
    agency: "CARE Ratings",
    action: "RATING_DOWNGRADE",
    actionDate: "2026-09-07",
    ratingBefore: "CARE AA",
    ratingAfter: "CARE AA-",
    outlookBefore: "Negative",
    outlookAfter: "Negative",
    instrument: "Non-Convertible Debentures & Term Loans",
    ratedDebtAmountCr: 11500.0,
    liquidityAssessment: "Adequate",
    keyDrivers: [
      "Industry-wide post-patent agrochemical channel destocking and price erosion",
      "Elevated net debt to EBITDA persisting above 3.5x threshold",
      "Subdued operating cash flows delaying scheduled leverage reduction"
    ],
    agencyRationale: "CARE Ratings downgraded UPL to CARE AA-/Negative reflecting sustained pressure on global agrochemical operating margins and higher-than-expected leverage.",
    equityConnection: {
      currentPriceInr: 545.0,
      priceAtActionInr: 610.0,
      equityReturnSinceActionPct: -10.66,
      equity1DayReturnPct: -4.2,
      equity1MonthReturnPct: -12.8,
      marketCapCr: 41000.0,
      impliedCreditSpreadBps: 260,
      transmission: "IMMEDIATE_PRICED_IN",
      equityImpactAnalysis: "Downgrade catalyzed institutional selling as debt service coverage ratio (DSCR) compressed to 1.35x, limiting dividend upside.",
    },
    sourceUrl: "https://www.careratings.com/",
  },

  // 4. INDIA RATINGS - DEFAULT & RESTRUCTURING
  {
    id: "cred-ir-01",
    symbol: "RELCAPITAL",
    companyName: "Reliance Capital Limited",
    sector: "Financial Services",
    agency: "India Ratings",
    action: "DEFAULT",
    actionDate: "2026-09-05",
    ratingBefore: "IND D",
    ratingAfter: "IND D",
    outlookBefore: "Under Review",
    outlookAfter: "Under Review",
    instrument: "Non-Convertible Debentures",
    ratedDebtAmountCr: 14800.0,
    liquidityAssessment: "Critical Deficit",
    keyDrivers: [
      "Ongoing Corporate Insolvency Resolution Process (CIRP) under Insolvency and Bankruptcy Code (IBC)",
      "Non-payment of principal and interest on debentures",
      "Legal delays in Hinduja Group resolution plan implementation"
    ],
    agencyRationale: "India Ratings reaffirmed IND D rating due to continued default on debt servicing obligations during active NCLT bankruptcy resolution proceedings.",
    equityConnection: {
      currentPriceInr: 11.2,
      priceAtActionInr: 14.5,
      equityReturnSinceActionPct: -22.76,
      equity1DayReturnPct: -4.8,
      equity1MonthReturnPct: -35.2,
      marketCapCr: 280.0,
      impliedCreditSpreadBps: 2400,
      transmission: "DISTRESS_DISCOUNT",
      equityImpactAnalysis: "Default confirmed total equity wipeout probability under NCLT resolution plan where equity shareholders receive zero recovery.",
    },
    sourceUrl: "https://www.indiaratings.co.in/",
  },
  {
    id: "cred-ir-02",
    symbol: "GMRINFRA",
    companyName: "GMR Airports Infrastructure Limited",
    sector: "Infrastructure & Logistics",
    agency: "India Ratings",
    action: "RATING_UPGRADE",
    actionDate: "2026-09-12",
    ratingBefore: "IND A+",
    ratingAfter: "IND AA-",
    outlookBefore: "Positive",
    outlookAfter: "Stable",
    instrument: "Long-Term Bank Loans & NCDs",
    ratedDebtAmountCr: 9800.0,
    liquidityAssessment: "Strong",
    keyDrivers: [
      "Passenger traffic across Delhi, Hyderabad, and Goa airports surpassing pre-pandemic peaks",
      "Successful non-aero commercial revenue expansion (duty-free, F&B)",
      "Strategic partnership with Groupe ADP and debt maturity lengthening"
    ],
    agencyRationale: "India Ratings has upgraded GMR Airports Infrastructure to IND AA-/Stable. The upgrade reflects consistent operating performance and improved financial flexibility.",
    equityConnection: {
      currentPriceInr: 92.5,
      priceAtActionInr: 81.0,
      equityReturnSinceActionPct: 14.2,
      equity1DayReturnPct: 3.8,
      equity1MonthReturnPct: 15.6,
      marketCapCr: 98000.0,
      impliedCreditSpreadBps: 115,
      transmission: "DELEVERAGING_EXPANSION",
      equityImpactAnalysis: "Upgrade to AA- lowered airport refinancing rate by 55 bps, boosting recurring pre-tax earnings by ₹120 Cr annually.",
    },
    sourceUrl: "https://www.indiaratings.co.in/",
  },

  // 5. ACUITE RATINGS - DEBT RESTRUCTURING RESOLUTION
  {
    id: "cred-ac-01",
    symbol: "SWANENERGY",
    companyName: "Swan Energy Limited",
    sector: "Energy & Petrochemicals",
    agency: "Acuité",
    action: "RATING_UPGRADE",
    actionDate: "2026-09-16",
    ratingBefore: "ACUITE BBB+",
    ratingAfter: "ACUITE A-",
    outlookBefore: "Positive",
    outlookAfter: "Stable",
    instrument: "Bank Facilities",
    ratedDebtAmountCr: 1200.0,
    liquidityAssessment: "Adequate",
    keyDrivers: [
      "Prepayment of consortium bank debt using monetization proceeds",
      "Resolution of Reliance Naval and Engineering debt settlement milestones",
      "Substantial reduction in promoter share encumbrances"
    ],
    agencyRationale: "Acuite Ratings upgraded Swan Energy to ACUITE A-/Stable based on successful deleveraging and operationalization of maritime shipyard contracts.",
    equityConnection: {
      currentPriceInr: 580.0,
      priceAtActionInr: 510.0,
      equityReturnSinceActionPct: 13.73,
      equity1DayReturnPct: 4.2,
      equity1MonthReturnPct: 16.5,
      marketCapCr: 18200.0,
      impliedCreditSpreadBps: 195,
      transmission: "DELEVERAGING_EXPANSION",
      equityImpactAnalysis: "Exit from BBB tier into A band unlocked collateral shares, reassuring institutional investors.",
    },
    sourceUrl: "https://www.acuite.in/",
  },
  {
    id: "cred-ac-02",
    symbol: "JPPOWER",
    companyName: "Jaiprakash Power Ventures Limited",
    sector: "Power & Utilities",
    agency: "Acuité",
    action: "DEBT_RESTRUCTURING",
    actionDate: "2026-09-08",
    ratingBefore: "ACUITE D",
    ratingAfter: "ACUITE BB",
    outlookBefore: "Negative",
    outlookAfter: "Stable",
    instrument: "Term Loans & Working Capital",
    ratedDebtAmountCr: 3200.0,
    liquidityAssessment: "Adequate",
    keyDrivers: [
      "Successful completion of debt resolution plan under RBI Prudential Framework",
      "Regularization of term loan servicing for over twelve consecutive months",
      "Higher plant load factor (PLF) across thermal and hydro power assets"
    ],
    agencyRationale: "Acuite assigned ACUITE BB/Stable following successful debt restructuring and track record of timely debt servicing post-resolution.",
    equityConnection: {
      currentPriceInr: 18.5,
      priceAtActionInr: 14.8,
      equityReturnSinceActionPct: 25.0,
      equity1DayReturnPct: 6.8,
      equity1MonthReturnPct: 28.5,
      marketCapCr: 12600.0,
      impliedCreditSpreadBps: 580,
      transmission: "CONVICTION_RALLY",
      equityImpactAnalysis: "Formal exit from default rating status unlocked retail and HNI speculative momentum as bankruptcy stigma dissipated.",
    },
    sourceUrl: "https://www.acuite.in/",
  },

  // 6. BRICKWORK RATINGS - CREDIT WATCH & LIQUIDITY
  {
    id: "cred-bw-01",
    symbol: "ZEEL",
    companyName: "Zee Entertainment Enterprises Ltd",
    sector: "Media & Entertainment",
    agency: "Brickwork",
    action: "CREDIT_WATCH",
    actionDate: "2026-09-15",
    ratingBefore: "BWR AA",
    ratingAfter: "BWR AA-",
    outlookBefore: "Negative",
    outlookAfter: "Watch Negative",
    instrument: "Bank Facilities",
    ratedDebtAmountCr: 1850.0,
    liquidityAssessment: "Stretched",
    keyDrivers: [
      "Fallout from terminated Sony merger and resulting legal claims",
      "Subdued advertising revenue growth and rising OTT content investments",
      "Management restructuring and board oversight scrutiny"
    ],
    agencyRationale: "Brickwork placed ratings on Credit Watch with Negative Implications following ongoing litigation post merger termination and operating margin compression.",
    equityConnection: {
      currentPriceInr: 135.0,
      priceAtActionInr: 165.0,
      equityReturnSinceActionPct: -18.18,
      equity1DayReturnPct: -4.5,
      equity1MonthReturnPct: -19.4,
      marketCapCr: 13000.0,
      impliedCreditSpreadBps: 360,
      transmission: "IMMEDIATE_PRICED_IN",
      equityImpactAnalysis: "Credit watch and downgrade reinforced equity market skepticism regarding stand-alone cash flow viability without global sponsor backing.",
    },
    sourceUrl: "https://www.brickworkratings.com/",
  }
];

export function getAllCreditActivities(): CreditActivityRecord[] {
  return CREDIT_ACTIVITIES_STORE;
}

export function filterCreditActivities(filters?: {
  agency?: string;
  action?: string;
  sector?: string;
  symbol?: string;
  search?: string;
}): CreditActivityRecord[] {
  if (!filters) return CREDIT_ACTIVITIES_STORE;

  return CREDIT_ACTIVITIES_STORE.filter((item) => {
    if (filters.agency && filters.agency !== "ALL" && item.agency !== filters.agency) {
      return false;
    }
    if (filters.action && filters.action !== "ALL" && item.action !== filters.action) {
      return false;
    }
    if (filters.sector && filters.sector !== "ALL" && item.sector !== filters.sector) {
      return false;
    }
    if (filters.symbol && filters.symbol.trim() !== "" && item.symbol.toUpperCase() !== filters.symbol.toUpperCase()) {
      return false;
    }
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase().trim();
      const match =
        item.symbol.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.agency.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q) ||
        item.agencyRationale.toLowerCase().includes(q) ||
        item.equityConnection.equityImpactAnalysis.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export function getCreditActivityBySymbol(symbol: string): CreditActivityRecord[] {
  const s = symbol.toUpperCase().trim();
  return CREDIT_ACTIVITIES_STORE.filter((c) => c.symbol.toUpperCase() === s);
}

/**
 * Connects credit rating events directly into the portfolio risk engine.
 */
export function assessPortfolioCreditRisk(
  positions: { symbol: string; companyName?: string; weight?: number; marketValueInr?: number }[] = []
): PortfolioCreditRiskAssessment {
  if (!positions || positions.length === 0) {
    return {
      totalHeldPositionsScanned: 0,
      positionsWithCreditEventsCount: 0,
      portfolioCreditHealthScore: 85,
      creditHealthGrade: "AAA_PRUDENT",
      holdingsWithDowngradeCount: 0,
      holdingsWithUpgradeCount: 0,
      holdingsWithLiquidityConcernsCount: 0,
      capitalInDowngradedDebtCr: 0,
      capitalInUpgradedDebtCr: 0,
      flaggedHoldings: [],
      portfolioCreditSummary: "No holdings scanned. Portfolio has zero credit risk exposure.",
    };
  }

  const flaggedHoldings: FlaggedCreditHolding[] = [];
  let baseHealthScore = 80;
  let downgradeCount = 0;
  let upgradeCount = 0;
  let liquidityCount = 0;
  let downgradedDebtCr = 0;
  let upgradedDebtCr = 0;

  for (const pos of positions) {
    const sym = pos.symbol.toUpperCase().trim();
    const records = getCreditActivityBySymbol(sym);
    if (records.length === 0) continue;

    const latest = records[0];
    let severity: FlaggedCreditHolding["actionSeverity"] = "NEUTRAL";
    let note = "";

    if (latest.action === "DEFAULT") {
      severity = "CRITICAL";
      downgradeCount += 1;
      baseHealthScore -= 35;
      downgradedDebtCr += (pos.marketValueInr || 100000) / 1e7;
      note = "Default Rating Alert (D): Instrument in default / insolvency. Total equity loss risk.";
    } else if (latest.action === "RATING_DOWNGRADE" || latest.action === "CREDIT_WATCH") {
      severity = "WARNING";
      downgradeCount += 1;
      baseHealthScore -= 18;
      downgradedDebtCr += (pos.marketValueInr || 100000) / 1e7;
      note = `Credit Downgrade / Watch Warning: ${latest.agency} placed rating on ${latest.ratingAfter} (${latest.outlookAfter}). Debt borrowing cost elevated; equity transmission shows derating pressure.`;
    } else if (latest.action === "LIQUIDITY_CONCERN") {
      severity = "WARNING";
      liquidityCount += 1;
      baseHealthScore -= 15;
      downgradedDebtCr += (pos.marketValueInr || 100000) / 1e7;
      note = `Liquidity Concern: ${latest.agency} assessed liquidity as ${latest.liquidityAssessment}. Cash conversion cycle strained.`;
    } else if (latest.action === "RATING_UPGRADE") {
      severity = "POSITIVE";
      upgradeCount += 1;
      baseHealthScore += 8;
      upgradedDebtCr += (pos.marketValueInr || 100000) / 1e7;
      note = `Credit Upgrade Tailwind: Upgraded to ${latest.ratingAfter} by ${latest.agency}. Cost of capital compressed; positive equity multiple expansion.`;
    }

    flaggedHoldings.push({
      symbol: sym,
      companyName: pos.companyName || sym,
      portfolioWeightPct: pos.weight || 0,
      portfolioValueInr: pos.marketValueInr || 0,
      creditRating: latest.ratingAfter,
      agency: latest.agency,
      latestAction: latest.action,
      actionSeverity: severity,
      liquidityStatus: latest.liquidityAssessment,
      advisoryNote: note,
      equityTransmission: latest.equityConnection.transmission,
      sourceUrl: latest.sourceUrl,
      actionDate: latest.actionDate,
    });
  }

  const finalScore = Math.max(15, Math.min(98, baseHealthScore));

  let grade: PortfolioCreditRiskAssessment["creditHealthGrade"] = "AAA_PRUDENT";
  let summary = "";

  if (downgradeCount > 0 && finalScore < 50) {
    grade = "HIGH_CREDIT_DISTRESS";
    summary = `Elevated Credit Distress: Portfolio has ${downgradeCount} holding(s) subject to credit rating downgrades, negative watch, or default. Expect financing friction and equity volatility.`;
  } else if (downgradeCount > 0 || liquidityCount > 0) {
    grade = "WATCH_EXPOSURE";
    summary = `Watch List Exposure: ${downgradeCount + liquidityCount} company in your portfolio faces credit agency scrutiny or liquidity tightness.`;
  } else if (upgradeCount > 0) {
    grade = "AAA_PRUDENT";
    summary = "High Credit Health: Held companies enjoy strong investment-grade ratings and positive credit migration tailwinds.";
  } else {
    grade = "INVESTMENT_GRADE";
    summary = "Investment Grade Baseline: Portfolio debt fundamentals remain stable with standard credit spreads.";
  }

  return {
    totalHeldPositionsScanned: positions.length,
    positionsWithCreditEventsCount: flaggedHoldings.length,
    portfolioCreditHealthScore: finalScore,
    creditHealthGrade: grade,
    holdingsWithDowngradeCount: downgradeCount,
    holdingsWithUpgradeCount: upgradeCount,
    holdingsWithLiquidityConcernsCount: liquidityCount,
    capitalInDowngradedDebtCr: Number(downgradedDebtCr.toFixed(2)),
    capitalInUpgradedDebtCr: Number(upgradedDebtCr.toFixed(2)),
    flaggedHoldings,
    portfolioCreditSummary: summary,
  };
}
