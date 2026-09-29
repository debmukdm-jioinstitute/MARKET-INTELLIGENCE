import type { FieldSource } from "@/lib/feeds/india/types";

export type LegalMonitorId =
  | "nclt"
  | "supreme_court"
  | "high_courts"
  | "sebi"
  | "cci"
  | "ed"
  | "rbi_enforcement";

export type ImpactLevel = "high" | "medium" | "low" | "unknown";

export type MonitorCoverage = "live" | "partial" | "planned";

export type CorporateRiskCase = {
  id: string;
  company: { symbol: string | null; name: string | null };
  legalCase: string;
  regulator: string;
  issue: string;
  financialExposure: string | null;
  potentialImpact: ImpactLevel;
  publishedAt?: string;
  source: FieldSource;
  monitorId: LegalMonitorId;
  href: string;
};

export type LegalMonitor = {
  id: LegalMonitorId;
  label: string;
  coverage: MonitorCoverage;
  summary: string;
  portalUrl: string;
  recentCaseCount: number;
};

export type LegalRiskHubPayload = {
  fetchedAt: string;
  corporateRiskMonitor: {
    activeCaseCount: number;
    highImpactCount: number;
    summary: string;
  };
  cases: CorporateRiskCase[];
  monitors: LegalMonitor[];
  sourceCatalog: { id: string; label: string; url: string; role: string }[];
};
