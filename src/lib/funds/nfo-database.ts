export interface MutualFundNfo {
  id: string;
  schemeName: string;
  amcName: string;
  category: "EQUITY_THEMATIC" | "EQUITY_FLEXI" | "MULTI_ASSET" | "DEBT_TARGET_MATURITY" | "INDEX_FUND" | "HYBRID";
  categoryLabel: string;
  openDate: string; // YYYY-MM-DD
  closeDate: string; // YYYY-MM-DD
  benchmark: string;
  minInvestmentInr: number;
  fundManager: string;
  riskRating: "Very High" | "High" | "Moderate" | "Moderately High";
  status: "OPEN" | "UPCOMING" | "CLOSED";
  objective: string;
}

export const ACTIVE_AND_UPCOMING_NFOS: MutualFundNfo[] = [
  {
    id: "nfo-icici-energy",
    schemeName: "ICICI Prudential Energy Opportunities Fund",
    amcName: "ICICI Prudential AMC",
    category: "EQUITY_THEMATIC",
    categoryLabel: "Thematic / Energy & Power",
    openDate: "2026-09-22",
    closeDate: "2026-10-06",
    benchmark: "Nifty Energy TRI",
    minInvestmentInr: 5000,
    fundManager: "Sankaran Naren & Mittul Kalawadia",
    riskRating: "Very High",
    status: "OPEN",
    objective: "Capital appreciation by investing predominantly in equity and equity related securities of companies engaged in energy and energy transition ecosystem.",
  },
  {
    id: "nfo-sbi-quant",
    schemeName: "SBI Quant & Systematic Alpha Fund",
    amcName: "SBI Mutual Fund",
    category: "EQUITY_FLEXI",
    categoryLabel: "Quant / Factor Investing",
    openDate: "2026-09-26",
    closeDate: "2026-10-10",
    benchmark: "BSE 500 TRI",
    minInvestmentInr: 5000,
    fundManager: "Raviprakash Sharma",
    riskRating: "Very High",
    status: "OPEN",
    objective: "Rule-based systematic multi-factor model targeting momentum, quality, low volatility, and value factors across listed NSE equities.",
  },
  {
    id: "nfo-motilal-mfg",
    schemeName: "Motilal Oswal Manufacturing Renaissance Fund",
    amcName: "Motilal Oswal AMC",
    category: "EQUITY_THEMATIC",
    categoryLabel: "Thematic / Manufacturing & PLI",
    openDate: "2026-10-02",
    closeDate: "2026-10-16",
    benchmark: "Nifty India Manufacturing TRI",
    minInvestmentInr: 500,
    fundManager: "Niket Shah & Ajay Khandelwal",
    riskRating: "Very High",
    status: "UPCOMING",
    objective: "Long-term capital growth by participating in India's industrial capex, PLI beneficiary sectors, capital goods, and electronics exports.",
  },
  {
    id: "nfo-bandhan-fin",
    schemeName: "Bandhan Financial Services Opportunities Fund",
    amcName: "Bandhan AMC",
    category: "EQUITY_THEMATIC",
    categoryLabel: "Thematic / Financials & Fintech",
    openDate: "2026-09-28",
    closeDate: "2026-10-12",
    benchmark: "Nifty Financial Services TRI",
    minInvestmentInr: 1000,
    fundManager: "Sumit Agrawal",
    riskRating: "Very High",
    status: "OPEN",
    objective: "Participation in structural credit expansion, asset management, insurance penetration, and high-margin NBFC retail lending.",
  },
  {
    id: "nfo-tata-multiasset",
    schemeName: "Tata Dynamic Multi-Asset Allocation Fund",
    amcName: "Tata AMC",
    category: "MULTI_ASSET",
    categoryLabel: "Multi Asset Allocation",
    openDate: "2026-10-08",
    closeDate: "2026-10-22",
    benchmark: "65% Nifty 500 + 25% CRISIL Composite Bond + 10% Gold",
    minInvestmentInr: 5000,
    fundManager: "Rahul Singh & Shailesh Jain",
    riskRating: "High",
    status: "UPCOMING",
    objective: "Dynamic asset allocation across equities, fixed income securities, gold ETFs, and silver to achieve risk-adjusted compounding.",
  },
];

export function getAllNfos(): MutualFundNfo[] {
  return ACTIVE_AND_UPCOMING_NFOS;
}
