import { buildFeedHub } from "@/lib/feeds/hub";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { sortNewsByFreshness } from "@/lib/feeds/news-sort";
import type { LegalMonitor, LegalMonitorId, LegalRiskHubPayload } from "./types";
import { impactRank, newsToRiskCase } from "./classify";

const MONITOR_DEFS: Omit<LegalMonitor, "recentCaseCount">[] = [
  {
    id: "nclt",
    label: "NCLT",
    coverage: "partial",
    summary: "IBC admissions, CIRP, liquidation — headline match from exchange & publisher RSS; dedicated NCLT cause-list crawl planned.",
    portalUrl: "https://nclt.gov.in/case-status",
  },
  {
    id: "supreme_court",
    label: "Supreme Court",
    coverage: "partial",
    summary: "SC corporate matters when tagged in news feeds; full SCI judgments ingest planned.",
    portalUrl: "https://main.sci.gov.in/",
  },
  {
    id: "high_courts",
    label: "High Courts",
    coverage: "planned",
    summary: "HC insolvency and securities appeals — link-out to eCourts; automated docket feed planned.",
    portalUrl: "https://hcservices.ecourts.gov.in/",
  },
  {
    id: "sebi",
    label: "SEBI orders",
    coverage: "partial",
    summary: "Enforcement and orders when headline mentions SEBI; SEBI orders page scrape planned.",
    portalUrl: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=18&smid=10",
  },
  {
    id: "cci",
    label: "CCI / Competition Commission",
    coverage: "partial",
    summary: "Competition probes and penalties from news keywords; CCI decision archive ingest planned.",
    portalUrl: "https://www.cci.gov.in/antitrust/orders",
  },
  {
    id: "ed",
    label: "Enforcement Directorate",
    coverage: "partial",
    summary: "ED / PMLA headlines from publishers; no official ED RSS wired yet.",
    portalUrl: "https://enforcementdirectorate.gov.in/",
  },
  {
    id: "rbi_enforcement",
    label: "RBI enforcement",
    coverage: "partial",
    summary: "RBI monetary penalties on banks/NBFCs from RBI news RSS + keyword match.",
    portalUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
  },
];

const SOURCE_CATALOG: LegalRiskHubPayload["sourceCatalog"] = [
  { id: "nclt", label: "NCLT", url: "https://nclt.gov.in/", role: "Insolvency and restructuring" },
  { id: "sci", label: "Supreme Court", url: "https://main.sci.gov.in/", role: "Apex court judgments" },
  { id: "ecourts", label: "eCourts", url: "https://hcservices.ecourts.gov.in/", role: "High Court case status" },
  { id: "sebi", label: "SEBI", url: "https://www.sebi.gov.in/", role: "Securities enforcement orders" },
  { id: "cci", label: "CCI", url: "https://www.cci.gov.in/", role: "Competition commission decisions" },
  { id: "ed", label: "ED", url: "https://enforcementdirectorate.gov.in/", role: "PMLA / FEMA enforcement" },
  { id: "rbi", label: "RBI", url: "https://www.rbi.org.in/", role: "Banking penalties and directions" },
  { id: "nse", label: "NSE / BSE", url: "https://www.nseindia.com/", role: "Exchange corporate announcements" },
];

function buildMonitors(cases: LegalRiskHubPayload["cases"]): LegalMonitor[] {
  const counts = new Map<LegalMonitorId, number>();
  for (const c of cases) counts.set(c.monitorId, (counts.get(c.monitorId) ?? 0) + 1);
  return MONITOR_DEFS.map((m) => ({
    ...m,
    recentCaseCount: counts.get(m.id) ?? 0,
    coverage: (counts.get(m.id) ?? 0) > 0 && m.coverage === "planned" ? "partial" : m.coverage,
  }));
}

export async function buildLegalRiskHub(): Promise<LegalRiskHubPayload> {
  const hub = await buildFeedHub();
  const news = sortNewsByFreshness(hub.news ?? []);
  const cases = news
    .map((n) => newsToRiskCase(n, INDIA_EQUITIES))
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => {
      const ir = impactRank(a.potentialImpact) - impactRank(b.potentialImpact);
      if (ir !== 0) return ir;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    })
    .slice(0, 48);

  const highImpactCount = cases.filter((c) => c.potentialImpact === "high").length;

  return {
    fetchedAt: hub.fetchedAt,
    corporateRiskMonitor: {
      activeCaseCount: cases.length,
      highImpactCount,
      summary:
        cases.length > 0
          ? `${cases.length} legal/regulatory headlines in live feeds — ${highImpactCount} flagged high impact. Verify on official NCLT/SEBI/court portals before acting.`
          : "No legal/regulatory keywords in current news batch — monitors stay on official portal links until dedicated crawls ship.",
    },
    cases,
    monitors: buildMonitors(cases),
    sourceCatalog: SOURCE_CATALOG,
  };
}

export function compactLegalRiskForMcp(payload: LegalRiskHubPayload) {
  return {
    fetchedAt: payload.fetchedAt,
    summary: payload.corporateRiskMonitor.summary,
    activeCaseCount: payload.corporateRiskMonitor.activeCaseCount,
    highImpactCount: payload.corporateRiskMonitor.highImpactCount,
    cases: payload.cases.slice(0, 20).map((c) => ({
      symbol: c.company.symbol,
      company: c.company.name,
      regulator: c.regulator,
      issue: c.issue,
      financialExposure: c.financialExposure,
      potentialImpact: c.potentialImpact,
      legalCase: c.legalCase.slice(0, 220),
      href: c.href,
    })),
    monitors: payload.monitors.map((m) => ({
      id: m.id,
      label: m.label,
      coverage: m.coverage,
      recentCaseCount: m.recentCaseCount,
    })),
  };
}
