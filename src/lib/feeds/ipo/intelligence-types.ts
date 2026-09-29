import type { FieldSource } from "@/lib/feeds/india/types";
import type { IpoGmpFields } from "@/lib/feeds/ipo/types";

export type IpoIntelCoverage = "live" | "partial" | "planned";

export type IpoIntelField<T> = {
  value: T;
  coverage: IpoIntelCoverage;
  source?: FieldSource;
  note?: string;
};

export type IpoDocumentRef = {
  url: string | null;
  label: "DRHP" | "RHP";
};

export type IpoListingPerformance = {
  listingPrice: number | null;
  referencePrice: number | null;
  listingGainPct: number | null;
  listingDate: string | null;
};

export type IpoSourceLink = {
  id: string;
  label: string;
  url: string;
  role: string;
};

export type IpoIntelligence = {
  ipoId: string;
  symbol: string;
  name: string;
  status: string;
  fetchedAt: string;
  drhp: IpoIntelField<IpoDocumentRef>;
  rhp: IpoIntelField<IpoDocumentRef>;
  issueSize: IpoIntelField<number>;
  freshIssue: IpoIntelField<number | null>;
  ofs: IpoIntelField<number | null>;
  promoters: IpoIntelField<string | null>;
  valuation: IpoIntelField<string | null>;
  peerValuation: IpoIntelField<string | null>;
  financials: IpoIntelField<string | null>;
  risks: IpoIntelField<string[]>;
  objectsOfIssue: IpoIntelField<string[]>;
  anchorInvestors: IpoIntelField<string | null>;
  subscription: IpoIntelField<string | null>;
  gmp: IpoIntelField<(IpoGmpFields & { disclaimer: string }) | null>;
  listingPerformance: IpoIntelField<IpoListingPerformance | null>;
  leadManagers: IpoIntelField<string | null>;
  registrar: IpoIntelField<{ name: string; website: string | null } | null>;
  sourceCatalog: IpoSourceLink[];
  prospectusExtractChars: number;
  prospectusError?: string;
};

export type IpoAnalystMemo = {
  headline: string;
  investmentThesis: string;
  strengths: string[];
  risks: string[];
  valuationView: string;
  peerComparison: string;
  subscriptionAndListingView: string;
  diligenceChecklist: string[];
  disclaimer: string;
  generatedAt: string;
  mode: "ai" | "rules";
  prospectusExtractChars: number;
};
