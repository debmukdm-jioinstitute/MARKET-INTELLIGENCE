import type { IndiaInstrument } from "@/lib/feeds/india/instruments";
import type { NewsItem } from "@/lib/feeds/types";
import type { CorporateRiskCase, ImpactLevel, LegalMonitorId } from "./types";

const LEGAL_HEADLINE =
  /\b(nclt|ibc|cirp|insolvency|bankruptcy|liquidation|supreme court|high court|sebi|cci|competition commission|enforcement directorate|\bed\b|pmla|rbi penalty|monetary penalty|fraud|forensic|disgorgement|debar|show cause|penalty order|regulatory action)\b/i;

export function isLegalRiskHeadline(title: string): boolean {
  return LEGAL_HEADLINE.test(title);
}

const MONITOR_RULES: { id: LegalMonitorId; re: RegExp; regulator: string }[] = [
  { id: "nclt", re: /\b(nclt|ibc|cirp|insolvency resolution|corporate insolvency)\b/i, regulator: "NCLT / IBC" },
  { id: "supreme_court", re: /\bsupreme court\b/i, regulator: "Supreme Court of India" },
  { id: "high_courts", re: /\bhigh court\b/i, regulator: "High Court" },
  { id: "sebi", re: /\bsebi\b/i, regulator: "SEBI" },
  {
    id: "cci",
    re: /\b(cci|competition commission|anti-?competitive|cartel)\b/i,
    regulator: "CCI (Competition Commission of India)",
  },
  { id: "ed", re: /\b(enforcement directorate|\bed\b|pmla|money laundering)\b/i, regulator: "Enforcement Directorate" },
  {
    id: "rbi_enforcement",
    re: /\b(rbi).{0,40}(penalty|fine|monetary|enforcement)|monetary penalty.{0,30}\brbi\b/i,
    regulator: "RBI enforcement",
  },
];

export function classifyRegulator(title: string): { monitorId: LegalMonitorId; regulator: string } {
  for (const rule of MONITOR_RULES) {
    if (rule.re.test(title)) return { monitorId: rule.id, regulator: rule.regulator };
  }
  if (/\binsolvency\b/i.test(title)) return { monitorId: "nclt", regulator: "NCLT / IBC" };
  if (/\bpenalty\b/i.test(title)) return { monitorId: "sebi", regulator: "Regulator (unspecified)" };
  return { monitorId: "sebi", regulator: "Legal / regulatory (feed)" };
}

const ISSUE_RULES: { re: RegExp; issue: string; impact: ImpactLevel }[] = [
  { re: /\b(cirp|insolvency|liquidation|nclt admission)\b/i, issue: "Insolvency / CIRP", impact: "high" },
  { re: /\b(ed raid|enforcement directorate|pmla|money laundering)\b/i, issue: "ED / PMLA enforcement", impact: "high" },
  { re: /\b(sebi).{0,30}(debar|trading ban)\b/i, issue: "Market access restriction", impact: "high" },
  { re: /\b(fraud|forensic|misstatement)\b/i, issue: "Fraud / governance", impact: "high" },
  { re: /\b(penalty|fine|monetary penalty|disgorgement)\b/i, issue: "Monetary penalty / disgorgement", impact: "medium" },
  { re: /\b(show cause|scn)\b/i, issue: "Show-cause / investigation", impact: "medium" },
  { re: /\b(competition|cartel|anti-?competitive)\b/i, issue: "Competition law", impact: "medium" },
  { re: /\b(supreme court|high court)\b/i, issue: "Court proceeding", impact: "unknown" },
];

export function classifyIssue(title: string): { issue: string; impact: ImpactLevel } {
  for (const rule of ISSUE_RULES) {
    if (rule.re.test(title)) return { issue: rule.issue, impact: rule.impact };
  }
  return { issue: "Legal / regulatory development", impact: "unknown" };
}

export function extractFinancialExposure(title: string): string | null {
  const inr = title.match(/(?:₹|Rs\.?\s*)\s*([\d,]+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|million|bn|billion)/i);
  if (inr) return `₹${inr[1]!.replace(/,/g, "")} ${inr[2]!.toLowerCase()} (headline)`;
  const usd = title.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(million|bn|billion)/i);
  if (usd) return `$${usd[1]!.replace(/,/g, "")} ${usd[2]!.toLowerCase()} (headline)`;
  if (/\bmaterial\b|\bsubstantial\b/i.test(title)) return "Not quantified — described as material in headline";
  return null;
}

export function inferPotentialImpact(issueImpact: ImpactLevel, title: string): ImpactLevel {
  if (issueImpact !== "unknown") return issueImpact;
  if (/\badmit|\binitiat|\braid|\barrest|\bsuspend\b/i.test(title)) return "high";
  if (/\bhearing|\blisting|\bplea\b/i.test(title)) return "low";
  return "unknown";
}

export function matchCompany(title: string, universe: IndiaInstrument[]): { symbol: string | null; name: string | null } {
  const upper = title.toUpperCase();
  for (const eq of universe) {
    if (upper.includes(eq.symbol)) return { symbol: eq.symbol, name: eq.name };
  }
  for (const eq of universe) {
    const token = eq.name.split(/\s+/)[0];
    if (token && token.length > 4 && upper.includes(token.toUpperCase())) {
      return { symbol: eq.symbol, name: eq.name };
    }
  }
  return { symbol: null, name: null };
}

export function newsToRiskCase(item: NewsItem, universe: IndiaInstrument[]): CorporateRiskCase | null {
  if (!isLegalRiskHeadline(item.title)) return null;
  const { monitorId, regulator } = classifyRegulator(item.title);
  const { issue, impact: issueImpact } = classifyIssue(item.title);
  const company = matchCompany(item.title, universe);
  const financialExposure = extractFinancialExposure(item.title);
  const potentialImpact = inferPotentialImpact(issueImpact, item.title);

  return {
    id: item.id,
    company,
    legalCase: item.title,
    regulator,
    issue,
    financialExposure,
    potentialImpact,
    publishedAt: item.publishedAt,
    source: {
      provider: item.source.toUpperCase(),
      url: item.link,
      asOf: item.publishedAt,
    },
    monitorId,
    href: item.link,
  };
}

export function impactRank(i: ImpactLevel): number {
  return i === "high" ? 0 : i === "medium" ? 1 : i === "low" ? 2 : 3;
}
