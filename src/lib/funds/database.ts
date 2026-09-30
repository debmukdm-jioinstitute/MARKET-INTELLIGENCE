// Mutual fund reference registry.
// Contains ONLY static reference data (scheme identity + official disclosure links).
// All numbers (NAV, AUM, holdings, etc.) were removed: NAV is resolved live via
// getLatestNavForFund() from ./amfi-crawler (AMFI NAVAll.txt). No figures are hardcoded.

export type FundRegistryEntry = {
  id: string;
  amfiCode: string;
  name: string;
  shortName: string;
  amc: string;
  category: string;
  benchmark: string;
  inceptionDate: string;
  disclosureUrl: string;
};

export const MUTUAL_FUNDS_STORE: FundRegistryEntry[] = [
  {
    id: "parag-parikh-flexi-cap",
    amfiCode: "122639",
    name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    shortName: "PPFAS Flexi Cap",
    amc: "PPFAS Mutual Fund",
    category: "Flexi Cap",
    benchmark: "NIFTY 500 TRI",
    inceptionDate: "2013-05-24",
    disclosureUrl: "https://amc.ppfas.com/downloads/portfolio-disclosure/",
  },
  {
    id: "hdfc-mid-cap-opportunities",
    amfiCode: "118989",
    name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
    shortName: "HDFC Mid-Cap",
    amc: "HDFC Mutual Fund",
    category: "Mid Cap",
    benchmark: "NIFTY Midcap 150 TRI",
    inceptionDate: "2007-06-25",
    disclosureUrl: "https://www.hdfcfund.com/investor-services/portfolio-details",
  },
  {
    id: "nippon-india-small-cap",
    amfiCode: "118778",
    name: "Nippon India Small Cap Fund - Direct Plan - Growth",
    shortName: "Nippon Small Cap",
    amc: "Nippon India Mutual Fund",
    category: "Small Cap",
    benchmark: "NIFTY Smallcap 250 TRI",
    inceptionDate: "2010-09-16",
    disclosureUrl: "https://mf.nipponindiaim.com/investor-services/monthly-portfolio",
  },
  {
    id: "icici-pru-bluechip",
    amfiCode: "120586",
    name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth",
    shortName: "ICICI Pru Bluechip",
    amc: "ICICI Prudential Mutual Fund",
    category: "Large Cap",
    benchmark: "NIFTY 100 TRI",
    inceptionDate: "2008-05-23",
    disclosureUrl: "https://www.icicipruamc.com/investor-services/monthly-portfolio",
  },
  {
    id: "quant-active-fund",
    amfiCode: "120828",
    name: "Quant Active Fund - Direct Plan - Growth",
    shortName: "Quant Active",
    amc: "Quant Mutual Fund",
    category: "Multi Cap",
    benchmark: "NIFTY 500 Multicap 50:25:25 TRI",
    inceptionDate: "2001-03-20",
    disclosureUrl: "https://quantmutual.com/statutory-disclosures",
  },
  {
    id: "sbi-small-cap",
    amfiCode: "125497",
    name: "SBI Small Cap Fund - Direct Plan - Growth",
    shortName: "SBI Small Cap",
    amc: "SBI Mutual Fund",
    category: "Small Cap",
    benchmark: "S&P BSE 250 SmallCap TRI",
    inceptionDate: "2009-09-09",
    disclosureUrl: "https://www.sbimf.com/en-us/portfolios",
  },
  {
    id: "mirae-asset-large-cap",
    amfiCode: "118834",
    name: "Mirae Asset Large Cap Fund - Direct Plan - Growth",
    shortName: "Mirae Asset Large Cap",
    amc: "Mirae Asset Mutual Fund",
    category: "Large Cap",
    benchmark: "NIFTY 100 TRI",
    inceptionDate: "2008-04-04",
    disclosureUrl: "https://www.miraeassetmf.co.in/downloads/portfolio",
  },
  {
    id: "motilal-oswal-midcap",
    amfiCode: "127042",
    name: "Motilal Oswal Midcap Fund - Direct Plan - Growth",
    shortName: "Motilal Midcap",
    amc: "Motilal Oswal Mutual Fund",
    category: "Mid Cap",
    benchmark: "NIFTY Midcap 150 TRI",
    inceptionDate: "2014-02-24",
    disclosureUrl: "https://www.motilaloswalmf.com/downloads/mutual-fund/Factsheet",
  },
];

export function getAllMutualFunds(): FundRegistryEntry[] {
  return MUTUAL_FUNDS_STORE;
}

export function getMutualFundById(id: string): FundRegistryEntry | undefined {
  return MUTUAL_FUNDS_STORE.find(
    (f) => f.id.toLowerCase() === id.toLowerCase() || f.amfiCode === id
  );
}

export function searchMutualFunds(query: string): FundRegistryEntry[] {
  if (!query || query.trim() === "") return MUTUAL_FUNDS_STORE;
  const q = query.toLowerCase().trim();
  return MUTUAL_FUNDS_STORE.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.shortName.toLowerCase().includes(q) ||
      f.amc.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  );
}

export function getFundsByCategory(category: string): FundRegistryEntry[] {
  if (!category || category === "All") return MUTUAL_FUNDS_STORE;
  return MUTUAL_FUNDS_STORE.filter((f) => f.category === category);
}
